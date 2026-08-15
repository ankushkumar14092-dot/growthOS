import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  assertDeployableChangeClass,
  DEPLOY_MODE_BY_CONNECTION,
  getConnectionCapabilities,
  isDeployableProposalType,
  type ConnectionType,
} from "@ai-growth-os/shared";
import { MembershipRole, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { DeployQueueService } from "./deploy-queue.service";

@Injectable()
export class DeploymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: DeployQueueService,
  ) {}

  async deploySite(
    userId: string,
    siteId: string,
    body: { patchIds?: string[] },
  ) {
    const site = await this.getSiteForUser(userId, siteId);
    const connectionType = site.connectionType as ConnectionType;
    const caps = getConnectionCapabilities(connectionType);
    if (!caps.canDeploy) {
      throw new BadRequestException("deploy_not_supported");
    }

    const where: Prisma.PatchWhereInput = {
      siteId: site.id,
      changeClass: { not: "blocked" },
      proposal: {
        status: "approved",
        proposalType: {
          in: [
            "meta_title",
            "meta_description",
            "faq_schema",
            "canonical",
            "open_graph",
            "llms_txt",
            "robots_txt",
            "sitemap_xml",
          ],
        },
      },
    };
    if (body.patchIds?.length) {
      where.id = { in: body.patchIds };
    }

    const patches = await this.prisma.patch.findMany({
      where,
      include: { proposal: true },
      orderBy: { createdAt: "asc" },
    });

    if (patches.length === 0) {
      throw new BadRequestException("no_deployable_patches");
    }

    const created = [];
    for (const patch of patches) {
      if (!isDeployableProposalType(patch.proposal.proposalType)) continue;
      try {
        assertDeployableChangeClass(patch.changeClass as "safe" | "approve", false);
      } catch {
        continue;
      }

      // Idempotency: skip if apply already succeeded or in flight
      const existing = await this.prisma.deployment.findFirst({
        where: {
          patchId: patch.id,
          action: "apply",
          status: { in: ["ready", "deploying", "verifying", "succeeded"] },
        },
      });
      if (existing) {
        created.push(this.toPublic(existing));
        continue;
      }

      const deployment = await this.prisma.deployment.create({
        data: {
          siteId: site.id,
          patchId: patch.id,
          proposalId: patch.proposalId,
          jobRunId: patch.proposal.jobRunId,
          action: "apply",
          status: "ready",
        },
      });
      await this.prisma.deploymentEvent.create({
        data: {
          deploymentId: deployment.id,
          event: "ready",
          message: "Deployment ready",
          meta: {
            proposalType: patch.proposal.proposalType,
            patchId: patch.id,
            connectionType,
            mode: DEPLOY_MODE_BY_CONNECTION[connectionType],
          },
        },
      });

      if (patch.proposal.jobRunId) {
        await this.prisma.jobRun.update({
          where: { id: patch.proposal.jobRunId },
          data: { status: "deploying" },
        });
      }

      await this.queue.enqueue({ deploymentId: deployment.id });
      created.push(this.toPublic(deployment));
    }

    if (created.length === 0) {
      throw new BadRequestException("no_new_deployments");
    }

    return { deployments: created };
  }

  async list(userId: string, siteId: string) {
    const site = await this.getSiteForUser(userId, siteId);
    const rows = await this.prisma.deployment.findMany({
      where: { siteId: site.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        patch: {
          include: {
            proposal: {
              select: {
                proposalType: true,
                afterValue: true,
                beforeValue: true,
              },
            },
          },
        },
      },
    });
    return rows.map((d) => this.toPublicDetailed(d));
  }

  async get(userId: string, deploymentId: string) {
    const deployment = await this.prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: {
        events: { orderBy: { createdAt: "asc" } },
        patch: {
          include: {
            proposal: {
              select: {
                proposalType: true,
                afterValue: true,
                beforeValue: true,
                businessImpact: true,
              },
            },
          },
        },
        site: true,
      },
    });
    if (!deployment || deployment.site.deletedAt) {
      throw new NotFoundException("deployment_not_found");
    }
    await this.requireMembership(userId, deployment.site.organizationId);

    return {
      ...this.toPublicDetailed(deployment),
      events: deployment.events.map((e) => ({
        id: e.id,
        event: e.event,
        message: e.message,
        meta: e.meta,
        createdAt: e.createdAt,
      })),
      timeline: this.toTimeline(deployment.events),
    };
  }

  async rollback(userId: string, deploymentId: string) {
    const apply = await this.prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: {
        patch: { include: { proposal: true } },
        site: true,
      },
    });
    if (!apply || apply.site.deletedAt) {
      throw new NotFoundException("deployment_not_found");
    }
    await this.requireMembership(userId, apply.site.organizationId);

    if (apply.action !== "apply") {
      throw new BadRequestException("not_an_apply_deployment");
    }
    if (!["succeeded", "failed", "verifying"].includes(apply.status)) {
      throw new BadRequestException("rollback_not_allowed");
    }

    const existingRb = await this.prisma.deployment.findFirst({
      where: {
        rollbackOfId: apply.id,
        action: "rollback",
        status: { in: ["ready", "deploying", "succeeded"] },
      },
    });
    if (existingRb) {
      return this.toPublic(existingRb);
    }

    const beforeState = (apply.backup as { beforeState?: { value?: unknown } })
      ?.beforeState ?? (apply.patch.beforeState as { value?: unknown });

    const rb = await this.prisma.deployment.create({
      data: {
        siteId: apply.siteId,
        patchId: apply.patchId,
        proposalId: apply.proposalId,
        action: "rollback",
        status: "ready",
        rollbackOfId: apply.id,
        backup: { beforeState } as Prisma.InputJsonValue,
      },
    });
    await this.prisma.deploymentEvent.create({
      data: {
        deploymentId: rb.id,
        event: "ready",
        message: "Manual rollback queued",
      },
    });
    await this.queue.enqueue({ deploymentId: rb.id });
    return this.toPublic(rb);
  }

  private toTimeline(
    events: Array<{
      event: string;
      message: string | null;
      createdAt: Date;
    }>,
  ) {
    const labels: Record<string, string> = {
      ready: "Ready",
      deployment_started: "Proposal Approved → Deploying",
      backup_created: "Backup Created",
      health_checked: "Website Reachable",
      patch_applied: "Patch Applied",
      verification_started: "Verification Started",
      verification_passed: "Verification Passed",
      verification_failed: "Verification Failed",
      rollback_started: "Rollback Started",
      rolled_back: "Rolled Back",
      completed: "Completed",
      failed: "Failed",
    };

    return events.map((e) => ({
      at: e.createdAt,
      label: labels[e.event] ?? e.message ?? e.event,
      event: e.event,
      ok: !["failed", "verification_failed"].includes(e.event),
    }));
  }

  private toPublic(d: {
    id: string;
    siteId: string;
    patchId: string;
    proposalId: string | null;
    jobRunId: string | null;
    action: string;
    status: string;
    errorMessage: string | null;
    rollbackOfId: string | null;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    verifyResult?: unknown;
    backup?: unknown;
  }) {
    const backup = d.backup as
      | { mode?: string; connectionType?: string; github?: { prUrl?: string }; pack?: unknown }
      | null
      | undefined;
    return {
      id: d.id,
      siteId: d.siteId,
      patchId: d.patchId,
      proposalId: d.proposalId,
      jobRunId: d.jobRunId,
      action: d.action,
      status: d.status,
      errorMessage: d.errorMessage,
      rollbackOfId: d.rollbackOfId,
      startedAt: d.startedAt,
      completedAt: d.completedAt,
      createdAt: d.createdAt,
      verifyResult: d.verifyResult ?? null,
      deployMode: backup?.mode ?? null,
      connectionType: backup?.connectionType ?? null,
      prUrl: backup?.github?.prUrl ?? null,
    };
  }

  private toPublicDetailed(d: {
    id: string;
    siteId: string;
    patchId: string;
    proposalId: string | null;
    jobRunId: string | null;
    action: string;
    status: string;
    errorMessage: string | null;
    rollbackOfId: string | null;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    verifyResult?: unknown;
    backup?: unknown;
    patch?: {
      changeClass?: string;
      proposal?: {
        proposalType: string;
        afterValue: string;
        beforeValue: string;
        businessImpact?: string;
      };
    };
  }) {
    return {
      ...this.toPublic(d),
      backup: d.backup ?? null,
      changeClass: d.patch?.changeClass,
      proposalType: d.patch?.proposal?.proposalType,
      beforeValue: d.patch?.proposal?.beforeValue,
      afterValue: d.patch?.proposal?.afterValue,
      businessImpact: d.patch?.proposal?.businessImpact,
      trust: {
        verified:
          d.status === "succeeded" &&
          Boolean(
            (d.verifyResult as { pass?: boolean } | null)?.pass === true ||
              d.action === "rollback",
          ),
        safe: d.patch?.changeClass !== "blocked",
        rollbackAvailable:
          d.action === "apply" &&
          ["succeeded", "failed", "rolled_back"].includes(d.status),
        backupStored: Boolean(
          d.backup &&
            typeof d.backup === "object" &&
            Object.keys(d.backup as object).length > 0,
        ),
      },
    };
  }

  private async getSiteForUser(userId: string, siteId: string) {
    const site = await this.prisma.site.findFirst({
      where: { id: siteId, deletedAt: null },
    });
    if (!site) throw new NotFoundException("site_not_found");
    await this.requireMembership(userId, site.organizationId);
    return site;
  }

  private async requireMembership(userId: string, organizationId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: { userId, organizationId },
      },
    });
    if (
      !membership ||
      ![MembershipRole.owner, MembershipRole.member].includes(membership.role)
    ) {
      throw new ForbiddenException("org_forbidden");
    }
    return membership;
  }
}
