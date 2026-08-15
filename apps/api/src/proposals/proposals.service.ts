import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ChangeClass } from "@ai-growth-os/shared";
import { MembershipRole, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ProposeQueueService } from "./propose-queue.service";

@Injectable()
export class ProposalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: ProposeQueueService,
  ) {}

  async list(userId: string, siteId: string, jobRunId?: string) {
    const site = await this.getSiteForUser(userId, siteId);
    const where: Prisma.ProposalWhereInput = {
      siteId: site.id,
      status: { not: "superseded" },
    };
    if (jobRunId) where.jobRunId = jobRunId;

    const rows = await this.prisma.proposal.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      take: 50,
      include: {
        issue: { select: { issueType: true, severity: true } },
        patch: { select: { id: true } },
      },
    });

    return rows.map((p) => this.toPublic(p));
  }

  async generate(userId: string, siteId: string, jobRunId?: string) {
    const site = await this.getSiteForUser(userId, siteId);
    let runId = jobRunId;
    if (!runId) {
      const latest = await this.prisma.jobRun.findFirst({
        where: {
          siteId: site.id,
          status: { in: ["done", "awaiting_approval"] },
        },
        orderBy: { createdAt: "desc" },
      });
      if (!latest) throw new NotFoundException("no_completed_scan");
      runId = latest.id;
    } else {
      const job = await this.prisma.jobRun.findFirst({
        where: { id: runId, siteId: site.id },
      });
      if (!job) throw new NotFoundException("job_not_found");
    }

    await this.queue.enqueue({ jobRunId: runId, siteId: site.id });
    return { queued: true, jobRunId: runId };
  }

  async approve(userId: string, proposalId: string) {
    const proposal = await this.getProposalForUser(userId, proposalId);
    if (proposal.status !== "pending_review") {
      throw new BadRequestException("proposal_not_pending");
    }
    if (proposal.changeClass === "blocked") {
      throw new ForbiddenException("blocked_proposal");
    }

    const changeClass = proposal.changeClass as ChangeClass;
    const target = targetFor(proposal.proposalType);

    const updated = await this.prisma.$transaction(async (tx) => {
      const p = await tx.proposal.update({
        where: { id: proposal.id },
        data: { status: "approved" },
      });
      const patch = await tx.patch.create({
        data: {
          proposalId: p.id,
          siteId: p.siteId,
          changeClass,
          target: target as Prisma.InputJsonValue,
          beforeState: { value: p.beforeValue } as Prisma.InputJsonValue,
          afterState: { value: p.afterValue } as Prisma.InputJsonValue,
        },
      });
      await tx.proposalEvent.create({
        data: {
          proposalId: p.id,
          event: "approved",
          actor: "user",
          meta: { userId, patchId: patch.id },
        },
      });
      await tx.proposalEvent.create({
        data: {
          proposalId: p.id,
          event: "converted_to_patch",
          actor: "system",
          meta: { patchId: patch.id },
        },
      });
      return { proposal: p, patchId: patch.id };
    });

    return {
      ...this.toPublic(updated.proposal),
      patchId: updated.patchId,
    };
  }

  async reject(userId: string, proposalId: string) {
    const proposal = await this.getProposalForUser(userId, proposalId);
    if (proposal.status !== "pending_review") {
      throw new BadRequestException("proposal_not_pending");
    }

    const p = await this.prisma.proposal.update({
      where: { id: proposal.id },
      data: { status: "rejected" },
    });
    await this.prisma.proposalEvent.create({
      data: {
        proposalId: p.id,
        event: "rejected",
        actor: "user",
        meta: { userId },
      },
    });
    return this.toPublic(p);
  }

  private toPublic(p: {
    id: string;
    siteId: string;
    issueId: string;
    jobRunId: string;
    proposalType: string;
    beforeValue: string;
    afterValue: string;
    businessImpact: string;
    impactType: string;
    reasoning: string;
    confidence: number;
    changeClass: string;
    status: string;
    source: string;
    model: string | null;
    promptVersion: string | null;
    createdAt: Date;
    updatedAt: Date;
    issue?: { issueType: string; severity: string };
    patch?: { id: string } | null;
  }) {
    return {
      id: p.id,
      siteId: p.siteId,
      issueId: p.issueId,
      jobRunId: p.jobRunId,
      proposalType: p.proposalType,
      beforeValue: p.beforeValue,
      afterValue: p.afterValue,
      businessImpact: p.businessImpact,
      impactType: p.impactType,
      reasoning: p.reasoning,
      confidence: p.confidence,
      changeClass: p.changeClass,
      status: p.status,
      source: p.source,
      model: p.model,
      promptVersion: p.promptVersion,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      issueType: p.issue?.issueType,
      issueSeverity: p.issue?.severity,
      patchId: p.patch?.id ?? null,
    };
  }

  private async getProposalForUser(userId: string, proposalId: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { site: true, patch: true },
    });
    if (!proposal || proposal.site.deletedAt) {
      throw new NotFoundException("proposal_not_found");
    }
    await this.requireMembership(userId, proposal.site.organizationId);
    return proposal;
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
