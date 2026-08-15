import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Job, Queue, Worker } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { ScanQueueService } from "./scan-queue.service";

export const SCHEDULE_QUEUE = "site-schedule";

export type ScheduleJobPayload = { siteId: string; reason: "weekly" | "manual_trigger" };

/** Monday 09:00 UTC — weekly re-audit cadence. */
const WEEKLY_CRON = "0 9 * * 1";

@Injectable()
export class ScheduleQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ScheduleQueueService.name);
  private queue!: Queue<ScheduleJobPayload>;
  private worker!: Worker<ScheduleJobPayload>;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly scans: ScanQueueService,
  ) {}

  async onModuleInit() {
    const connection = this.redisConnection();
    this.queue = new Queue<ScheduleJobPayload>(SCHEDULE_QUEUE, { connection });
    this.worker = new Worker<ScheduleJobPayload>(
      SCHEDULE_QUEUE,
      async (job: Job<ScheduleJobPayload>) => {
        await this.runScheduledScan(job.data.siteId, job.data.reason);
      },
      { connection, concurrency: 1 },
    );
    this.worker.on("failed", (job, err) => {
      this.logger.warn(`schedule job failed ${job?.id}: ${err.message}`);
    });
    this.logger.log("Schedule queue worker started");
    await this.syncAllWeeklySites();
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
  }

  async syncSiteSchedule(siteId: string, schedule: "weekly" | "manual" | string) {
    const schedulerId = `weekly-${siteId}`;
    if (schedule === "weekly") {
      await this.queue.upsertJobScheduler(
        schedulerId,
        { pattern: WEEKLY_CRON },
        {
          name: "weekly-scan",
          data: { siteId, reason: "weekly" },
          opts: { removeOnComplete: 20, removeOnFail: 20 },
        },
      );
      this.logger.log(`weekly schedule upserted for site ${siteId}`);
    } else {
      try {
        await this.queue.removeJobScheduler(schedulerId);
      } catch {
        const repeatable = await this.queue.getRepeatableJobs();
        for (const r of repeatable) {
          if (r.id === schedulerId || r.key.includes(siteId)) {
            await this.queue.removeRepeatableByKey(r.key);
          }
        }
      }
      this.logger.log(`weekly schedule removed for site ${siteId}`);
    }
  }

  private async syncAllWeeklySites() {
    const sites = await this.prisma.site.findMany({
      where: { deletedAt: null },
      select: { id: true, settings: true },
      take: 500,
    });
    for (const site of sites) {
      const settings = (site.settings ?? {}) as { schedule?: string };
      if (settings.schedule === "weekly" || settings.schedule === undefined) {
        // Default weekly when unset (matches site create defaults)
        await this.syncSiteSchedule(site.id, "weekly");
      }
    }
  }

  private async runScheduledScan(siteId: string, reason: string) {
    const site = await this.prisma.site.findFirst({
      where: { id: siteId, deletedAt: null },
    });
    if (!site) return;

    const settings = (site.settings ?? {}) as { schedule?: string };
    if (reason === "weekly" && settings.schedule === "manual") {
      return;
    }

    // Skip if a scan is already in flight
    const active = await this.prisma.jobRun.findFirst({
      where: {
        siteId,
        status: {
          in: ["queued", "crawling", "auditing", "proposing", "deploying", "verifying"],
        },
      },
    });
    if (active) {
      this.logger.log(`skip scheduled scan ${siteId}: active job ${active.id}`);
      return;
    }

    const job = await this.prisma.jobRun.create({
      data: { siteId, status: "queued" },
    });
    await this.scans.enqueue({ jobRunId: job.id, siteId });
    this.logger.log(`scheduled scan enqueued ${job.id} for ${site.domain} (${reason})`);
  }

  private redisConnection() {
    const url = this.config.get<string>("REDIS_URL") ?? "redis://localhost:6379";
    const u = new URL(url);
    const dbPath = u.pathname?.replace(/^\//, "");
    const db = dbPath && /^\d+$/.test(dbPath) ? Number(dbPath) : undefined;
    return {
      host: u.hostname,
      port: Number(u.port || 6379),
      ...(db !== undefined ? { db } : {}),
      maxRetriesPerRequest: null as null,
    };
  }
}
