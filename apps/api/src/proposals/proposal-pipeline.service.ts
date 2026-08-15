import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { UsageService } from "../billing/usage.service";
import { AutoApplyService } from "./auto-apply.service";
import {
  buildRuleProposal,
  issueToProposalType,
  maybeLlmPolish,
} from "./proposal-engine";

@Injectable()
export class ProposalPipelineService {
  private readonly logger = new Logger(ProposalPipelineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly autoApply: AutoApplyService,
    private readonly usage: UsageService,
  ) {}

  async run(jobRunId: string) {
    const job = await this.prisma.jobRun.findUnique({
      where: { id: jobRunId },
      include: { site: true },
    });
    if (!job) return;

    try {
      await this.prisma.jobRun.update({
        where: { id: jobRunId },
        data: { status: "proposing", finishedAt: null },
      });

      const prior = await this.prisma.proposal.findMany({
        where: {
          siteId: job.siteId,
          status: { in: ["draft", "pending_review"] },
        },
      });
      for (const p of prior) {
        await this.prisma.proposal.update({
          where: { id: p.id },
          data: { status: "superseded" },
        });
        await this.prisma.proposalEvent.create({
          data: {
            proposalId: p.id,
            event: "superseded",
            actor: "system",
            meta: { reason: "new_scan", jobRunId },
          },
        });
      }

      const issues = await this.prisma.issue.findMany({
        where: { jobRunId },
        include: { page: true },
        orderBy: { createdAt: "asc" },
      });

      const apiKey = this.config.get<string>("OPENAI_API_KEY");
      let created = 0;
      const max = 20;
      const skippedTypes: Record<string, number> = {};

      for (const issue of issues) {
        if (created >= max) break;
        const proposalType = issueToProposalType(issue.issueType);
        if (!proposalType) {
          skippedTypes[issue.issueType] = (skippedTypes[issue.issueType] ?? 0) + 1;
          continue;
        }

        const pageUrl =
          issue.page?.url ??
          ((job.site.settings as { base_url?: string })?.base_url ??
            `https://${job.site.domain}`);

        const extracted = (issue.page?.extracted ?? {}) as {
          title?: string | null;
          metaDescription?: string | null;
          canonical?: string | null;
        };

        let beforeValue = "";
        if (proposalType === "meta_title") {
          beforeValue = extracted.title ?? "";
        } else if (proposalType === "meta_description") {
          beforeValue = extracted.metaDescription ?? "";
        } else if (proposalType === "canonical") {
          beforeValue = extracted.canonical ?? "";
        }

        if (proposalType === "faq_schema") {
          const alreadyFaq = await this.prisma.proposal.findFirst({
            where: { jobRunId, proposalType: "faq_schema" },
          });
          if (alreadyFaq) continue;
        }

        if (
          proposalType === "llms_txt" ||
          proposalType === "robots_txt" ||
          proposalType === "sitemap_xml"
        ) {
          const already = await this.prisma.proposal.findFirst({
            where: { jobRunId, proposalType },
          });
          if (already) continue;
        }

        if (proposalType === "canonical" || proposalType === "open_graph") {
          const count = await this.prisma.proposal.count({
            where: { jobRunId, proposalType },
          });
          if (count >= 5) continue;
        }

        let draft = buildRuleProposal({
          proposalType,
          beforeValue,
          domain: job.site.domain,
          pageUrl,
        });
        draft = await maybeLlmPolish({
          apiKey,
          draft,
          domain: job.site.domain,
          pageUrl,
        });

        const proposal = await this.prisma.proposal.create({
          data: {
            siteId: job.siteId,
            issueId: issue.id,
            jobRunId,
            proposalType: draft.proposalType,
            beforeValue: draft.beforeValue,
            afterValue: draft.afterValue,
            businessImpact: draft.businessImpact,
            impactType: draft.impactType,
            reasoning: draft.reasoning,
            confidence: draft.confidence,
            changeClass: draft.changeClass,
            status: "pending_review",
            source: draft.source,
            model: draft.model,
            promptVersion: draft.promptVersion,
          },
        });

        await this.prisma.proposalEvent.create({
          data: {
            proposalId: proposal.id,
            event: "created",
            actor: "system",
            meta: {
              source: draft.source,
              changeClass: draft.changeClass,
            } as Prisma.InputJsonValue,
          },
        });
        created += 1;
        await this.usage.record(job.site.organizationId, "ai_generation", {
          meta: { proposalId: proposal.id, proposalType: draft.proposalType },
        });
      }

      const autoApplied = await this.autoApply.applySafeProposals(jobRunId);

      const pending = await this.prisma.proposal.count({
        where: { jobRunId, status: "pending_review" },
      });

      const nextStatus = pending > 0 ? "awaiting_approval" : "done";
      await this.prisma.jobRun.update({
        where: { id: jobRunId },
        data: {
          status: nextStatus,
          finishedAt: new Date(),
        },
      });

      this.logger.log(
        `propose job ${jobRunId}: created ${created}, pending ${pending}, autoApplied ${autoApplied}` +
          (Object.keys(skippedTypes).length
            ? `; skipped=${JSON.stringify(skippedTypes)}`
            : ""),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "propose_failed";
      this.logger.error(`propose ${jobRunId}: ${message}`);
      await this.prisma.jobRun.update({
        where: { id: jobRunId },
        data: {
          status: "failed",
          errorCode: "propose_failed",
          errorMessage: message.slice(0, 500),
          finishedAt: new Date(),
        },
      });
      throw err;
    }
  }
}
