import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Job, Queue, Worker } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { ScanPipelineService } from "./scan-pipeline.service";

export const SCAN_QUEUE = "scan";

export type ScanJobPayload = { jobRunId: string; siteId: string };

@Injectable()
export class ScanQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ScanQueueService.name);
  private queue!: Queue<ScanJobPayload>;
  private worker!: Worker<ScanJobPayload>;

  constructor(
    private readonly config: ConfigService,
    private readonly pipeline: ScanPipelineService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    const connection = this.redisConnection();
    this.queue = new Queue<ScanJobPayload>(SCAN_QUEUE, { connection });
    this.worker = new Worker<ScanJobPayload>(
      SCAN_QUEUE,
      async (job: Job<ScanJobPayload>) => {
        await this.pipeline.run(job.data.jobRunId);
      },
      {
        connection,
        concurrency: 2,
        // Live crawls can exceed 30s (many pages × slow TTFB); default lock orphans jobs.
        lockDuration: 10 * 60 * 1000,
        stalledInterval: 60_000,
      },
    );
    this.worker.on("failed", (job, err) => {
      this.logger.warn(`scan job failed ${job?.id}: ${err.message}`);
    });
    this.worker.on("stalled", (jobId) => {
      this.logger.warn(`scan job stalled ${jobId}`);
    });
    this.logger.log("Scan queue worker started");
    await this.recoverOrphanedJobRuns();
  }

  /** After API restart/hot-reload, in-flight crawls are dead but DB still says crawling. */
  private async recoverOrphanedJobRuns() {
    const cutoff = new Date(Date.now() - 90_000);
    const orphans = await this.prisma.jobRun.findMany({
      where: {
        finishedAt: null,
        status: { in: ["queued", "crawling", "auditing"] },
        OR: [
          { startedAt: { lt: cutoff } },
          { startedAt: null, createdAt: { lt: cutoff } },
        ],
      },
      take: 25,
    });
    for (const job of orphans) {
      this.logger.warn(`re-enqueue orphaned scan ${job.id} (was ${job.status})`);
      await this.enqueue({ jobRunId: job.id, siteId: job.siteId });
    }
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
  }

  async enqueue(payload: ScanJobPayload) {
    await this.queue.add("scan-site", payload, {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    });
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
