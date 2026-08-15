import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Job, Queue, Worker } from "bullmq";
import { ProposalPipelineService } from "./proposal-pipeline.service";

export const PROPOSE_QUEUE = "propose";

export type ProposeJobPayload = { jobRunId: string; siteId: string };

@Injectable()
export class ProposeQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ProposeQueueService.name);
  private queue!: Queue<ProposeJobPayload>;
  private worker!: Worker<ProposeJobPayload>;

  constructor(
    private readonly config: ConfigService,
    @Inject(forwardRef(() => ProposalPipelineService))
    private readonly pipeline: ProposalPipelineService,
  ) {}

  onModuleInit() {
    const connection = this.redisConnection();
    this.queue = new Queue<ProposeJobPayload>(PROPOSE_QUEUE, { connection });
    this.worker = new Worker<ProposeJobPayload>(
      PROPOSE_QUEUE,
      async (job: Job<ProposeJobPayload>) => {
        await this.pipeline.run(job.data.jobRunId);
      },
      { connection, concurrency: 1 },
    );
    this.worker.on("failed", (job, err) => {
      this.logger.warn(`propose job failed ${job?.id}: ${err.message}`);
    });
    this.logger.log("Propose queue worker started");
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
  }

  async enqueue(payload: ProposeJobPayload) {
    await this.queue.add("propose-site", payload, {
      attempts: 2,
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
