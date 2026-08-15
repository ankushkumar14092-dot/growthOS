import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ProposeQueueService } from "../proposals/propose-queue.service";
import { PrismaService } from "../prisma/prisma.service";
import { auditPage, auditSiteLevel } from "./auditors";
import { ContentResolver, toExtracted } from "./content-resolver";

@Injectable()
export class ScanPipelineService {
  private readonly logger = new Logger(ScanPipelineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly resolver: ContentResolver,
    private readonly proposeQueue: ProposeQueueService,
  ) {}

  async run(jobRunId: string) {
    const job = await this.prisma.jobRun.findUnique({ where: { id: jobRunId } });
    if (!job) return;

    try {
      await this.prisma.jobRun.update({
        where: { id: jobRunId },
        data: {
          status: "crawling",
          startedAt: job.startedAt ?? new Date(),
          errorCode: null,
          errorMessage: null,
        },
      });

      const bundle = await this.resolver.resolveSite(job.siteId);

      const crawl = await this.prisma.crawl.create({
        data: {
          jobRunId,
          pageCount: 0,
          meta: bundle.meta as Prisma.InputJsonValue,
        },
      });

      const pageIds: Array<{
        id: string;
        url: string;
        extracted: ReturnType<typeof toExtracted>;
        status: number | null;
      }> = [];

      for (const doc of bundle.documents) {
        const extracted = toExtracted(doc);
        const page = await this.prisma.page.create({
          data: {
            crawlId: crawl.id,
            url: doc.url,
            httpStatus: doc.httpStatus,
            extracted: extracted as unknown as Prisma.InputJsonValue,
          },
        });
        pageIds.push({
          id: page.id,
          url: doc.url,
          extracted,
          status: doc.httpStatus,
        });
      }

      await this.prisma.crawl.update({
        where: { id: crawl.id },
        data: { pageCount: pageIds.length },
      });

      await this.prisma.jobRun.update({
        where: { id: jobRunId },
        data: { status: "auditing" },
      });

      const issueRows: Prisma.IssueCreateManyInput[] = [];

      for (const siteIssue of auditSiteLevel({
        seedUrl: bundle.seedUrl,
        hasRobots: bundle.hasRobots,
        hasSitemap: bundle.hasSitemap,
        hasLlmsTxt: bundle.hasLlmsTxt,
      })) {
        issueRows.push({
          jobRunId,
          pageId: null,
          issueType: siteIssue.issueType,
          severity: siteIssue.severity,
          evidence: siteIssue.evidence as Prisma.InputJsonValue,
        });
      }

      for (const p of pageIds) {
        for (const iss of auditPage(p.url, p.extracted, p.status)) {
          issueRows.push({
            jobRunId,
            pageId: p.id,
            issueType: iss.issueType,
            severity: iss.severity,
            evidence: iss.evidence as Prisma.InputJsonValue,
          });
        }
      }

      if (issueRows.length) {
        await this.prisma.issue.createMany({ data: issueRows });
      }

      await this.prisma.jobRun.update({
        where: { id: jobRunId },
        data: { status: "proposing" },
      });
      await this.proposeQueue.enqueue({
        jobRunId,
        siteId: job.siteId,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "scan_failed";
      this.logger.error(`job ${jobRunId} failed: ${message}`);
      const code =
        message.includes("timeout") || message.includes("Timeout")
          ? "crawl_timeout"
          : message.includes("zip")
            ? "crawl_failed"
            : "crawl_failed";
      await this.prisma.jobRun.update({
        where: { id: jobRunId },
        data: {
          status: "failed",
          errorCode: code,
          errorMessage: message.slice(0, 500),
          finishedAt: new Date(),
        },
      });
      throw err;
    }
  }
}
