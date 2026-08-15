import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { MembershipRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { UsageService } from "../billing/usage.service";
import { AuditLogService } from "./audit-log.service";
import { ScanQueueService } from "./scan-queue.service";

@Injectable()
export class ScansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: ScanQueueService,
    private readonly audit: AuditLogService,
    private readonly usage: UsageService,
  ) {}

  async startAudit(userId: string, siteId: string) {
    const site = await this.getSiteForUser(userId, siteId);
    const job = await this.prisma.jobRun.create({
      data: {
        siteId: site.id,
        status: "queued",
      },
    });

    await this.queue.enqueue({ jobRunId: job.id, siteId: site.id });
    await this.usage.record(site.organizationId, "scan", {
      meta: { siteId: site.id, jobRunId: job.id },
    });
    await this.audit.write({
      organizationId: site.organizationId,
      actorUserId: userId,
      action: "scan.started",
      resourceType: "job_run",
      resourceId: job.id,
      meta: { siteId: site.id, connectionType: site.connectionType },
    });

    return {
      id: job.id,
      siteId: job.siteId,
      status: job.status,
      createdAt: job.createdAt,
    };
  }

  async getJobRun(userId: string, jobRunId: string) {
    const job = await this.prisma.jobRun.findUnique({
      where: { id: jobRunId },
      include: {
        site: true,
        crawl: true,
        _count: { select: { issues: true } },
      },
    });
    if (!job || job.site.deletedAt) throw new NotFoundException("job_not_found");
    await this.requireMembership(userId, job.site.organizationId);

    const proposalCount = await this.prisma.proposal.count({
      where: { jobRunId: job.id, status: { not: "superseded" } },
    });

    return {
      id: job.id,
      siteId: job.siteId,
      status: job.status,
      errorCode: job.errorCode,
      errorMessage: job.errorMessage,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
      createdAt: job.createdAt,
      pageCount: job.crawl?.pageCount ?? 0,
      issueCount: job._count.issues,
      proposalCount,
      connectionType: job.site.connectionType,
      domain: job.site.domain,
    };
  }

  async listJobRuns(userId: string, siteId: string) {
    const site = await this.getSiteForUser(userId, siteId);
    const jobs = await this.prisma.jobRun.findMany({
      where: { siteId: site.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        crawl: true,
        _count: { select: { issues: true } },
      },
    });
    return jobs.map((j) => ({
      id: j.id,
      status: j.status,
      errorCode: j.errorCode,
      createdAt: j.createdAt,
      finishedAt: j.finishedAt,
      pageCount: j.crawl?.pageCount ?? 0,
      issueCount: j._count.issues,
    }));
  }

  async listIssues(userId: string, siteId: string, jobRunId?: string) {
    const site = await this.getSiteForUser(userId, siteId);
    let runId = jobRunId;
    if (!runId) {
      const latest = await this.prisma.jobRun.findFirst({
        where: { siteId: site.id },
        orderBy: { createdAt: "desc" },
      });
      if (!latest) return [];
      runId = latest.id;
    } else {
      const job = await this.prisma.jobRun.findFirst({
        where: { id: runId, siteId: site.id },
      });
      if (!job) throw new NotFoundException("job_not_found");
    }

    const issues = await this.prisma.issue.findMany({
      where: { jobRunId: runId },
      orderBy: [{ severity: "asc" }, { createdAt: "asc" }],
      include: { page: { select: { url: true } } },
    });

    return issues.map((i) => ({
      id: i.id,
      jobRunId: i.jobRunId,
      issueType: i.issueType,
      severity: i.severity,
      evidence: i.evidence,
      resolved: i.resolved,
      pageUrl: i.page?.url ?? null,
      createdAt: i.createdAt,
    }));
  }

  async listPages(userId: string, siteId: string, jobRunId?: string) {
    const site = await this.getSiteForUser(userId, siteId);
    let runId = jobRunId;
    if (!runId) {
      const latest = await this.prisma.jobRun.findFirst({
        where: { siteId: site.id, status: "done" },
        orderBy: { createdAt: "desc" },
      });
      if (!latest) return [];
      runId = latest.id;
    }

    const crawl = await this.prisma.crawl.findFirst({
      where: { jobRunId: runId, jobRun: { siteId: site.id } },
      include: { pages: { orderBy: { createdAt: "asc" }, take: 100 } },
    });
    if (!crawl) return [];

    return crawl.pages.map((p) => ({
      id: p.id,
      url: p.url,
      httpStatus: p.httpStatus,
      extracted: p.extracted,
    }));
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
