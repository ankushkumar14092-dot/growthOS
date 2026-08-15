import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  assertDeployableChangeClass,
  getConnectionCapabilities,
  isDeployableProposalType,
  type ConnectionType,
} from "@ai-growth-os/shared";
import { PrismaService } from "../prisma/prisma.service";
import { DeployQueueService } from "../deployments/deploy-queue.service";

function targetFor(proposalType: string) {
  if (proposalType === "meta_title") {
    return { type: "post_meta", key: "rank_math_title" };
  }
  if (proposalType === "meta_description") {
    return { type: "post_meta", key: "rank_math_description" };
  }
  if (proposalType === "canonical") {
    return { type: "option", key: "aigos_canonical" };
  }
  if (proposalType === "open_graph") {
    return { type: "option", key: "aigos_open_graph" };
  }
  if (proposalType === "llms_txt") {
    return { type: "option", key: "aigos_llms_txt" };
  }
  if (proposalType === "robots_txt") {
    return { type: "option", key: "aigos_robots_txt" };
  }
  if (proposalType === "sitemap_xml") {
    return { type: "option", key: "aigos_sitemap_xml" };
  }
  return { type: "option", key: "faq_schema_jsonld" };
}

@Injectable()
export class AutoApplyService {
  private readonly logger = new Logger(AutoApplyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly deployQueue: DeployQueueService,
  ) {}

  /**
   * When safe_auto_apply is on: approve + patch + enqueue deploy for `safe` proposals only.
   * `approve` / `blocked` still wait for humans.
   */
  async applySafeProposals(jobRunId: string): Promise<number> {
    const job = await this.prisma.jobRun.findUnique({
      where: { id: jobRunId },
      include: { site: true },
    });
    if (!job) return 0;

    const settings = (job.site.settings ?? {}) as { safe_auto_apply?: boolean };
    if (!settings.safe_auto_apply) return 0;

    const safes = await this.prisma.proposal.findMany({
      where: {
        jobRunId,
        status: "pending_review",
        changeClass: "safe",
      },
    });

    let applied = 0;
    const patchIds: string[] = [];

    for (const p of safes) {
      if (!isDeployableProposalType(p.proposalType)) continue;
      try {
        assertDeployableChangeClass("safe", false);
      } catch {
        continue;
      }

      const result = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.proposal.update({
          where: { id: p.id },
          data: { status: "approved" },
        });
        const patch = await tx.patch.create({
          data: {
            proposalId: updated.id,
            siteId: updated.siteId,
            changeClass: "safe",
            target: targetFor(updated.proposalType) as Prisma.InputJsonValue,
            beforeState: { value: updated.beforeValue } as Prisma.InputJsonValue,
            afterState: { value: updated.afterValue } as Prisma.InputJsonValue,
          },
        });
        await tx.proposalEvent.create({
          data: {
            proposalId: updated.id,
            event: "approved",
            actor: "system",
            meta: { reason: "safe_auto_apply", patchId: patch.id },
          },
        });
        return patch.id;
      });

      patchIds.push(result);
      applied += 1;
    }

    if (patchIds.length === 0) return 0;

    const caps = getConnectionCapabilities(job.site.connectionType as ConnectionType);
    if (!caps.canDeploy) {
      this.logger.log(
        `safe_auto_apply approved ${applied} but deploy not supported for ${job.site.connectionType}`,
      );
      return applied;
    }

    for (const patchId of patchIds) {
      const existing = await this.prisma.deployment.findFirst({
        where: {
          patchId,
          action: "apply",
          status: { in: ["ready", "deploying", "verifying", "succeeded"] },
        },
      });
      if (existing) continue;

      const deployment = await this.prisma.deployment.create({
        data: {
          siteId: job.siteId,
          patchId,
          jobRunId,
          action: "apply",
          status: "ready",
        },
      });
      await this.prisma.deploymentEvent.create({
        data: {
          deploymentId: deployment.id,
          event: "queued",
          message: "Safe auto-apply queued deploy",
        },
      });
      await this.deployQueue.enqueue({ deploymentId: deployment.id });
    }

    this.logger.log(`safe_auto_apply: ${applied} proposals for job ${jobRunId}`);
    return applied;
  }
}
