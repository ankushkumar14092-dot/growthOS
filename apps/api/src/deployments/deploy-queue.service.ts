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
import { DeployPipelineService } from "./deploy-pipeline.service";

export const DEPLOY_QUEUE = "deploy";

export type DeployJobPayload = { deploymentId: string };

@Injectable()
export class DeployQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DeployQueueService.name);
  private queue!: Queue<DeployJobPayload>;
  private worker!: Worker<DeployJobPayload>;

  constructor(
    private readonly config: ConfigService,
    @Inject(forwardRef(() => DeployPipelineService))
    private readonly pipeline: DeployPipelineService,
  ) {}

  onModuleInit() {
    const connection = this.redisConnection();
    this.queue = new Queue<DeployJobPayload>(DEPLOY_QUEUE, { connection });
    this.worker = new Worker<DeployJobPayload>(
      DEPLOY_QUEUE,
      async (job: Job<DeployJobPayload>) => {
        await this.pipeline.run(job.data.deploymentId);
      },
      { connection, concurrency: 1 },
    );
    this.worker.on("failed", (job, err) => {
      this.logger.warn(`deploy job failed ${job?.id}: ${err.message}`);
    });
    this.logger.log("Deploy queue worker started");
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
  }

  async enqueue(payload: DeployJobPayload) {
    // Idempotent job id per deployment — no blind retry of apply
    await this.queue.add("deploy-patch", payload, {
      jobId: `deploy-${payload.deploymentId}`,
      attempts: 1,
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
