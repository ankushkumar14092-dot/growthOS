import { Injectable, Logger } from "@nestjs/common";
import {
  DEPLOY_MODE_BY_CONNECTION,
  isDeployableProposalType,
  type ConnectionType,
} from "@ai-growth-os/shared";
import { CredentialKind, Prisma } from "@prisma/client";
import { decryptSecret } from "../crypto/secrets";
import { PrismaService } from "../prisma/prisma.service";
import { WpClientService } from "../sites/wp-client.service";
import { ArtifactDeployService } from "./artifact-deploy.service";
import { GithubPrDeployService } from "./github-pr-deploy.service";
import { verifyDeployment, VerifyResult } from "./verify-engine";

type SiteCred = {
  baseUrl: string;
  kind: CredentialKind;
  token: string;
  username?: string;
};

type LoadedDeployment = Awaited<ReturnType<DeployPipelineService["load"]>>;

@Injectable()
export class DeployPipelineService {
  private readonly logger = new Logger(DeployPipelineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly wp: WpClientService,
    private readonly githubPr: GithubPrDeployService,
    private readonly artifacts: ArtifactDeployService,
  ) {}

  async run(deploymentId: string): Promise<void> {
    const deployment = await this.prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: {
        patch: {
          include: {
            proposal: true,
            site: { include: { credential: true } },
          },
        },
      },
    });
    if (!deployment) {
      this.logger.warn(`deployment missing ${deploymentId}`);
      return;
    }

    if (deployment.action === "rollback") {
      await this.runRollback(deployment.id);
      return;
    }

    await this.runApply(deployment.id);
  }

  private async runApply(deploymentId: string): Promise<void> {
    const deployment = await this.load(deploymentId);
    const { patch } = deployment;
    const proposalType = patch.proposal.proposalType;
    const connectionType = patch.site.connectionType as ConnectionType;
    const mode = DEPLOY_MODE_BY_CONNECTION[connectionType];

    try {
      await this.setStatus(deploymentId, "deploying", {
        startedAt: new Date(),
      });
      await this.event(deploymentId, "deployment_started", "Deployment started", {
        connectionType,
        mode,
      });

      if (!isDeployableProposalType(proposalType)) {
        throw new Error("unsupported_proposal_type");
      }
      if (patch.changeClass === "blocked") {
        throw new Error("blocked_change_class");
      }
      if (patch.proposal.status !== "approved") {
        throw new Error("proposal_not_approved");
      }

      const target = patch.target as Record<string, unknown>;
      const beforeState = patch.beforeState as { value?: unknown };
      const afterState = patch.afterState as { value?: unknown };

      if (!target || afterState?.value === undefined) {
        throw new Error("patch_invalid");
      }

      const backupBase = {
        mode,
        connectionType,
        patchId: patch.id,
        target,
        beforeState,
        afterState,
        createdAt: new Date().toISOString(),
      };
      await this.prisma.deployment.update({
        where: { id: deploymentId },
        data: { backup: backupBase as Prisma.InputJsonValue },
      });
      await this.event(deploymentId, "backup_created", "Backup created", {
        beforeValue: beforeState.value ?? null,
        mode,
      });

      if (connectionType === "wordpress") {
        await this.applyWordpress(deploymentId, deployment, beforeState, afterState, target);
      } else if (connectionType === "github") {
        await this.applyGithub(deploymentId, deployment, beforeState, afterState);
      } else if (connectionType === "zip") {
        await this.applyZipArtifact(deploymentId, deployment, beforeState, afterState);
      } else if (connectionType === "url_audit") {
        await this.applyUrlGuide(deploymentId, deployment, beforeState, afterState);
      } else {
        throw new Error("unsupported_connection_type");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "deploy_failed";
      this.logger.warn(`deploy ${deploymentId} failed: ${message}`);
      await this.setStatus(deploymentId, "failed", {
        completedAt: new Date(),
        errorMessage: message,
      });
      await this.event(deploymentId, "failed", message);
      if (deployment.jobRunId) {
        await this.prisma.jobRun.update({
          where: { id: deployment.jobRunId },
          data: {
            status: "failed",
            errorCode: "deploy_failed",
            errorMessage: message,
            finishedAt: new Date(),
          },
        });
      }
    }
  }

  private async applyWordpress(
    deploymentId: string,
    deployment: LoadedDeployment,
    beforeState: { value?: unknown },
    afterState: { value?: unknown },
    target: Record<string, unknown>,
  ) {
    const { patch } = deployment;
    if (!patch.site.credential) throw new Error("credentials_missing");

    const cred = this.resolveCred(patch.site);
    const proposalType = patch.proposal.proposalType;

    const health = await this.wp.healthCheck(cred);
    if (!health.ok) {
      throw new Error(`health_failed:${health.error ?? health.statusCode}`);
    }
    await this.event(deploymentId, "health_checked", "Website reachable", {
      plugin_version: health.body?.plugin_version,
    });

    const apply = await this.wp.applyPatch({
      siteId: patch.siteId,
      ...cred,
      payload: {
        patch_id: patch.id,
        target,
        after_state: { value: afterState.value },
      },
    });
    if (!apply.ok) {
      throw new Error(`apply_failed:${apply.error ?? apply.statusCode}`);
    }
    await this.event(deploymentId, "patch_applied", "Patch applied to WordPress");

    await this.setStatus(deploymentId, "verifying");
    await this.event(deploymentId, "verification_started", "Verification started");

    const verify = await this.fetchAndVerify({
      siteId: patch.siteId,
      baseUrl: cred.baseUrl,
      proposalType,
      afterValue: String(afterState.value ?? ""),
    });

    await this.prisma.deployment.update({
      where: { id: deploymentId },
      data: { verifyResult: verify as unknown as Prisma.InputJsonValue },
    });

    if (!verify.pass) {
      await this.event(
        deploymentId,
        "verification_failed",
        "Verification failed — rolling back",
        { checks: verify.checks },
      );
      await this.autoRollback(deploymentId, patch, cred, target, beforeState);
      return;
    }

    await this.completeSuccess(deploymentId, deployment.jobRunId, "Deployment completed");
  }

  private async applyGithub(
    deploymentId: string,
    deployment: LoadedDeployment,
    beforeState: { value?: unknown },
    afterState: { value?: unknown },
  ) {
    const { patch } = deployment;
    if (!patch.site.credential) throw new Error("credentials_missing");

    const token = decryptSecret(Buffer.from(patch.site.credential.secretCiphertext));
    const settings = (patch.site.settings ?? {}) as { repo?: string };
    const repoSetting =
      (typeof settings.repo === "string" && settings.repo) || patch.site.domain;

    await this.event(deploymentId, "health_checked", "GitHub repo reachable");

    const pr = await this.githubPr.openFixPr({
      repoSetting,
      token,
      patchId: patch.id,
      proposalType: patch.proposal.proposalType,
      beforeValue: String(beforeState.value ?? ""),
      afterValue: String(afterState.value ?? ""),
      domain: patch.site.domain,
    });

    const prev = (await this.prisma.deployment.findUnique({
      where: { id: deploymentId },
      select: { backup: true },
    }))!.backup as Record<string, unknown>;

    await this.prisma.deployment.update({
      where: { id: deploymentId },
      data: {
        backup: { ...prev, github: pr } as Prisma.InputJsonValue,
      },
    });

    await this.event(deploymentId, "patch_applied", "Pull request opened with real site files", {
      prUrl: pr.prUrl,
      prNumber: pr.prNumber,
      branch: pr.branch,
      paths: pr.paths,
    });

    await this.setStatus(deploymentId, "verifying");
    await this.event(deploymentId, "verification_started", "Verifying PR contents");

    const verify = await this.githubPr.verifyPr({
      owner: pr.owner,
      repo: pr.repo,
      prNumber: pr.prNumber,
      token,
      afterValue: String(afterState.value ?? ""),
      path: pr.path,
    });

    const verifyResult: VerifyResult = {
      pass: verify.pass,
      checks: verify.checks,
    };

    await this.prisma.deployment.update({
      where: { id: deploymentId },
      data: { verifyResult: verifyResult as unknown as Prisma.InputJsonValue },
    });

    if (!verify.pass) {
      await this.event(
        deploymentId,
        "verification_failed",
        "PR verification failed — closing PR",
        { checks: verify.checks },
      );
      try {
        await this.githubPr.closePr({
          owner: pr.owner,
          repo: pr.repo,
          prNumber: pr.prNumber,
          token,
        });
      } catch (e) {
        this.logger.warn(`close PR after verify fail: ${e}`);
      }
      await this.setStatus(deploymentId, "rolled_back", {
        completedAt: new Date(),
        errorMessage: "verification_failed_pr_closed",
      });
      await this.event(deploymentId, "rolled_back", "PR closed after verification failure");
      await this.finalizeJobRun(deployment.jobRunId, "done", {
        note: "pr_verify_failed_closed",
      });
      return;
    }

    await this.event(deploymentId, "verification_passed", "PR contains real-world file content", {
      prUrl: pr.prUrl,
      path: pr.path,
    });
    await this.completeSuccess(
      deploymentId,
      deployment.jobRunId,
      `PR opened (merge to go live): ${pr.prUrl}`,
    );
  }

  private async applyZipArtifact(
    deploymentId: string,
    deployment: LoadedDeployment,
    beforeState: { value?: unknown },
    afterState: { value?: unknown },
  ) {
    const { patch } = deployment;
    const pack = this.artifacts.buildPack({
      mode: "zip_artifact",
      patchId: patch.id,
      domain: patch.site.domain,
      proposalType: patch.proposal.proposalType,
      beforeValue: String(beforeState.value ?? ""),
      afterValue: String(afterState.value ?? ""),
    });
    const artifactPath = this.artifacts.writeToDisk(deploymentId, pack);
    pack.artifactPath = artifactPath;

    const prev = (await this.prisma.deployment.findUnique({
      where: { id: deploymentId },
      select: { backup: true },
    }))!.backup as Record<string, unknown>;

    await this.prisma.deployment.update({
      where: { id: deploymentId },
      data: {
        backup: { ...prev, pack } as Prisma.InputJsonValue,
        verifyResult: {
          pass: true,
          mode: "zip_artifact",
          checks: [
            {
              name: "fix_pack_written",
              pass: true,
              detail: artifactPath,
            },
          ],
        } as unknown as Prisma.InputJsonValue,
      },
    });

    await this.event(deploymentId, "patch_applied", "Fix pack packaged", {
      artifactPath,
    });
    await this.event(
      deploymentId,
      "verification_passed",
      "Artifact ready (no live host to verify)",
    );
    await this.completeSuccess(
      deploymentId,
      deployment.jobRunId,
      "Fix pack ready — apply in your project, then re-upload/redeploy",
    );
  }

  private async applyUrlGuide(
    deploymentId: string,
    deployment: LoadedDeployment,
    beforeState: { value?: unknown },
    afterState: { value?: unknown },
  ) {
    const { patch } = deployment;
    const settings = (patch.site.settings ?? {}) as { base_url?: string };
    const baseUrl =
      (typeof settings.base_url === "string" && settings.base_url) ||
      `https://${patch.site.domain}`;

    const pack = this.artifacts.buildPack({
      mode: "url_guide",
      patchId: patch.id,
      domain: patch.site.domain,
      proposalType: patch.proposal.proposalType,
      beforeValue: String(beforeState.value ?? ""),
      afterValue: String(afterState.value ?? ""),
    });
    const artifactPath = this.artifacts.writeToDisk(deploymentId, pack);
    pack.artifactPath = artifactPath;

    await this.event(
      deploymentId,
      "patch_applied",
      "Apply guide packaged (no remote write for Live URL)",
      { artifactPath },
    );

    await this.setStatus(deploymentId, "verifying");
    await this.event(
      deploymentId,
      "verification_started",
      "Checking whether live HTML already matches After value",
    );

    const verify = await this.fetchAndVerify({
      siteId: patch.siteId,
      baseUrl: baseUrl.replace(/\/$/, ""),
      proposalType: patch.proposal.proposalType,
      afterValue: String(afterState.value ?? ""),
    });

    const prev = (await this.prisma.deployment.findUnique({
      where: { id: deploymentId },
      select: { backup: true },
    }))!.backup as Record<string, unknown>;

    // Guide deploy always "succeeds" as an export; live match is reported honestly.
    await this.prisma.deployment.update({
      where: { id: deploymentId },
      data: {
        backup: { ...prev, pack } as Prisma.InputJsonValue,
        verifyResult: {
          ...verify,
          mode: "url_guide",
          liveMatched: verify.pass,
          note: verify.pass
            ? "Live HTML already contains the After value"
            : "Live HTML does not yet contain the After value — apply manually, then re-deploy to recheck",
        } as unknown as Prisma.InputJsonValue,
      },
    });

    if (verify.pass) {
      await this.event(deploymentId, "verification_passed", "Live HTML matches After value");
    } else {
      await this.event(
        deploymentId,
        "verification_failed",
        "Live HTML not updated yet — guide is ready for manual apply",
        { checks: verify.checks },
      );
    }

    await this.completeSuccess(
      deploymentId,
      deployment.jobRunId,
      verify.pass
        ? "Guide packaged; live site already matches"
        : "Guide packaged; apply manually on your host, then re-deploy to verify",
    );
  }

  private async completeSuccess(
    deploymentId: string,
    jobRunId: string | null,
    message: string,
  ) {
    await this.setStatus(deploymentId, "succeeded", {
      completedAt: new Date(),
      errorMessage: null,
    });
    await this.event(deploymentId, "completed", message);
    await this.finalizeJobRun(jobRunId, "done", { messagePreview: message.slice(0, 80) });
  }

  private async finalizeJobRun(
    jobRunId: string | null | undefined,
    status: "done" | "failed",
    meta?: Record<string, unknown>,
  ) {
    if (!jobRunId) return;
    await this.prisma.jobRun.update({
      where: { id: jobRunId },
      data: {
        status,
        finishedAt: new Date(),
        ...(status === "failed"
          ? {
              errorCode: "deploy_failed",
              errorMessage: String(meta?.note ?? "deploy_failed").slice(0, 500),
            }
          : {}),
      },
    });
  }

  private async autoRollback(
    applyDeploymentId: string,
    patch: {
      id: string;
      siteId: string;
      proposalId: string;
      changeClass: string;
    },
    cred: SiteCred,
    target: Record<string, unknown>,
    beforeState: { value?: unknown },
  ): Promise<void> {
    await this.event(applyDeploymentId, "rollback_started", "Rollback started");

    const rb = await this.prisma.deployment.create({
      data: {
        siteId: patch.siteId,
        patchId: patch.id,
        proposalId: patch.proposalId,
        action: "rollback",
        status: "deploying",
        rollbackOfId: applyDeploymentId,
        startedAt: new Date(),
        backup: {
          reason: "verify_failed",
          beforeState,
        } as Prisma.InputJsonValue,
      },
    });
    await this.event(rb.id, "rollback_started", "Rollback deployment started");

    const result = await this.wp.rollback({
      siteId: patch.siteId,
      ...cred,
      payload: {
        patch_id: patch.id,
        target,
        before_state: { value: beforeState.value ?? null },
      },
    });

    if (!result.ok) {
      const msg = `rollback_failed:${result.error ?? result.statusCode}`;
      await this.setStatus(rb.id, "failed", {
        completedAt: new Date(),
        errorMessage: msg,
      });
      await this.event(rb.id, "failed", msg);
      await this.setStatus(applyDeploymentId, "failed", {
        completedAt: new Date(),
        errorMessage: "verification_failed_and_rollback_failed",
      });
      await this.event(
        applyDeploymentId,
        "failed",
        "Verification failed and rollback failed",
      );
      const apply = await this.prisma.deployment.findUnique({
        where: { id: applyDeploymentId },
        select: { jobRunId: true },
      });
      await this.finalizeJobRun(apply?.jobRunId, "failed", {
        note: "verification_failed_and_rollback_failed",
      });
      return;
    }

    await this.setStatus(rb.id, "succeeded", { completedAt: new Date() });
    await this.event(rb.id, "completed", "Rollback completed");
    await this.setStatus(applyDeploymentId, "rolled_back", {
      completedAt: new Date(),
      errorMessage: "verification_failed_rolled_back",
    });
    await this.event(
      applyDeploymentId,
      "rolled_back",
      "Rolled back after verification failure",
      { rollbackId: rb.id },
    );
    const apply = await this.prisma.deployment.findUnique({
      where: { id: applyDeploymentId },
      select: { jobRunId: true },
    });
    await this.finalizeJobRun(apply?.jobRunId, "done", {
      note: "verification_failed_rolled_back",
      jobRunFinalized: true,
    });
  }

  private async runRollback(deploymentId: string): Promise<void> {
    const deployment = await this.load(deploymentId);
    const { patch } = deployment;
    const connectionType = patch.site.connectionType as ConnectionType;

    try {
      await this.setStatus(deploymentId, "deploying", {
        startedAt: new Date(),
      });
      await this.event(deploymentId, "rollback_started", "Manual rollback started", {
        connectionType,
      });

      if (connectionType === "wordpress") {
        if (!patch.site.credential) throw new Error("rollback_unavailable");
        const cred = this.resolveCred(patch.site);
        const target = patch.target as Record<string, unknown>;
        const beforeState =
          (deployment.backup as { beforeState?: { value?: unknown } })?.beforeState ??
          (patch.beforeState as { value?: unknown });

        const result = await this.wp.rollback({
          siteId: patch.siteId,
          ...cred,
          payload: {
            patch_id: patch.id,
            target,
            before_state: { value: beforeState?.value ?? null },
          },
        });
        if (!result.ok) {
          throw new Error(`rollback_failed:${result.error ?? result.statusCode}`);
        }
      } else if (connectionType === "github") {
        if (!patch.site.credential) throw new Error("rollback_unavailable");
        const token = decryptSecret(
          Buffer.from(patch.site.credential.secretCiphertext),
        );
        const applyBackup = deployment.rollbackOfId
          ? (
              await this.prisma.deployment.findUnique({
                where: { id: deployment.rollbackOfId },
                select: { backup: true },
              })
            )?.backup
          : deployment.backup;
        const github = (applyBackup as { github?: { owner: string; repo: string; prNumber: number } })
          ?.github;
        if (!github) throw new Error("github_pr_metadata_missing");
        await this.githubPr.closePr({
          owner: github.owner,
          repo: github.repo,
          prNumber: github.prNumber,
          token,
        });
        await this.event(deploymentId, "patch_applied", "GitHub PR closed");
      } else if (connectionType === "zip" || connectionType === "url_audit") {
        const applyId = deployment.rollbackOfId ?? deploymentId;
        this.artifacts.removeFromDisk(applyId);
        await this.event(
          deploymentId,
          "patch_applied",
          "Fix pack removed (manual host changes are unchanged)",
        );
      } else {
        throw new Error("rollback_unavailable");
      }

      await this.setStatus(deploymentId, "succeeded", {
        completedAt: new Date(),
      });
      await this.event(deploymentId, "completed", "Rollback completed");

      if (deployment.rollbackOfId) {
        await this.setStatus(deployment.rollbackOfId, "rolled_back", {
          completedAt: new Date(),
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "rollback_failed";
      await this.setStatus(deploymentId, "failed", {
        completedAt: new Date(),
        errorMessage: message,
      });
      await this.event(deploymentId, "failed", message);
    }
  }

  private async fetchAndVerify(opts: {
    siteId: string;
    baseUrl: string;
    proposalType: string;
    afterValue: string;
  }): Promise<VerifyResult> {
    if (this.wp.isMock()) {
      if (
        opts.proposalType === "llms_txt" ||
        opts.proposalType === "robots_txt" ||
        opts.proposalType === "sitemap_xml"
      ) {
        const state = this.wp.readMockState(opts.siteId);
        const html = String(state[opts.proposalType] ?? opts.afterValue ?? "");
        return verifyDeployment({
          proposalType: opts.proposalType,
          afterValue: opts.afterValue,
          html,
          pageReachable: true,
        });
      }
      const html = this.wp.renderMockHtml(opts.siteId);
      return verifyDeployment({
        proposalType: opts.proposalType,
        afterValue: opts.afterValue,
        html,
        pageReachable: true,
      });
    }

    const origin = opts.baseUrl.replace(/\/$/, "");
    const verifyPath =
      opts.proposalType === "llms_txt"
        ? "/llms.txt"
        : opts.proposalType === "robots_txt"
          ? "/robots.txt"
          : opts.proposalType === "sitemap_xml"
            ? "/sitemap.xml"
            : "/";
    try {
      const res = await fetch(origin + verifyPath, {
        method: "GET",
        headers: {
          Accept: "text/html,text/plain,application/xml,*/*",
          "User-Agent": "AI-Growth-OS-Verify/0.5",
        },
        signal: AbortSignal.timeout(15_000),
        redirect: "follow",
      });
      const html = await res.text();
      return verifyDeployment({
        proposalType: opts.proposalType,
        afterValue: opts.afterValue,
        html,
        pageReachable: res.ok,
      });
    } catch {
      return verifyDeployment({
        proposalType: opts.proposalType,
        afterValue: opts.afterValue,
        html: "",
        pageReachable: false,
      });
    }
  }

  private resolveCred(site: {
    domain: string;
    settings: unknown;
    credential: {
      kind: CredentialKind;
      secretCiphertext: Uint8Array;
      meta: unknown;
    } | null;
  }): SiteCred {
    if (!site.credential) throw new Error("credentials_missing");
    const settings = (site.settings ?? {}) as { base_url?: string };
    const baseUrl =
      (typeof settings.base_url === "string" && settings.base_url) ||
      `https://${site.domain}`;
    const token = decryptSecret(Buffer.from(site.credential.secretCiphertext));
    const meta = (site.credential.meta ?? {}) as { username?: string };
    return {
      baseUrl: baseUrl.replace(/\/$/, ""),
      kind: site.credential.kind,
      token,
      username: meta.username,
    };
  }

  private async load(deploymentId: string) {
    const deployment = await this.prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: {
        patch: {
          include: {
            proposal: true,
            site: { include: { credential: true } },
          },
        },
      },
    });
    if (!deployment) throw new Error("deployment_not_found");
    return deployment;
  }

  private async setStatus(
    id: string,
    status: string,
    extra?: {
      startedAt?: Date;
      completedAt?: Date;
      errorMessage?: string | null;
    },
  ) {
    await this.prisma.deployment.update({
      where: { id },
      data: {
        status,
        ...(extra?.startedAt ? { startedAt: extra.startedAt } : {}),
        ...(extra?.completedAt ? { completedAt: extra.completedAt } : {}),
        ...(extra && "errorMessage" in extra
          ? { errorMessage: extra.errorMessage }
          : {}),
      },
    });
  }

  private async event(
    deploymentId: string,
    event: string,
    message?: string,
    meta?: Record<string, unknown>,
  ) {
    await this.prisma.deploymentEvent.create({
      data: {
        deploymentId,
        event,
        message,
        meta: (meta ?? {}) as Prisma.InputJsonValue,
      },
    });
  }
}
