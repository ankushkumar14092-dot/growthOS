import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { JOB_RUN_STATUSES } from "@ai-growth-os/shared";

@Injectable()
export class HealthService {
  constructor(private readonly config: ConfigService) {}

  async getHealth() {
    const redisUrl = this.config.get<string>("REDIS_URL") ?? "redis://localhost:6379";
    let redis: "up" | "down" = "down";

    const client = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 1500,
      lazyConnect: true,
    });

    try {
      await client.connect();
      const pong = await client.ping();
      redis = pong === "PONG" ? "up" : "down";
    } catch {
      redis = "down";
    } finally {
      client.disconnect();
    }

    return {
      ok: true,
      service: "ai-growth-os-api",
      phase: "beta-track-a",
      redis,
      databaseUrlConfigured: Boolean(this.config.get("DATABASE_URL")),
      openaiConfigured: Boolean(this.config.get("OPENAI_API_KEY")),
      tavilyConfigured: Boolean(this.config.get("TAVILY_API_KEY")),
      serpConfigured: Boolean(this.config.get("SERP_API_KEY")),
      serpProvider: this.config.get<string>("SERP_PROVIDER") ?? null,
      jobRunStatuses: JOB_RUN_STATUSES,
      timestamp: new Date().toISOString(),
    };
  }
}
