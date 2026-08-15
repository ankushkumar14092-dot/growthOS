import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import * as fs from "node:fs";
import * as path from "node:path";
import { PrismaService } from "../prisma/prisma.service";

/** Founder funnel — keep names stable for dashboards. */
export const FUNNEL_EVENTS = [
  "visitor",
  "signup",
  "workspace_created",
  "website_connected",
  "scan_started",
  "scan_finished",
  "proposal_viewed",
  "proposal_approved",
  "deployment_started",
  "deployment_verified",
  "user_returns",
  "waitlist_joined",
] as const;

export type FunnelEvent = (typeof FUNNEL_EVENTS)[number] | string;

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async track(input: {
    event: string;
    anonymousId?: string;
    organizationId?: string;
    userId?: string;
    props?: Record<string, unknown>;
  }) {
    const row = {
      at: new Date().toISOString(),
      event: input.event.slice(0, 80),
      anonymousId: input.anonymousId?.slice(0, 64),
      organizationId: input.organizationId,
      userId: input.userId,
      props: input.props ?? {},
    };

    this.appendFile(row);

    if (input.organizationId) {
      try {
        await this.prisma.auditLog.create({
          data: {
            organizationId: input.organizationId,
            actorUserId: input.userId ?? null,
            action: `funnel.${row.event}`,
            resourceType: "analytics",
            resourceId: input.anonymousId ?? null,
            meta: JSON.parse(JSON.stringify(row.props ?? {})) as Prisma.InputJsonValue,
          },
        });
      } catch (err) {
        this.logger.warn(
          `audit funnel skip: ${err instanceof Error ? err.message : "error"}`,
        );
      }
    }

    return { ok: true };
  }

  private appendFile(row: Record<string, unknown>) {
    try {
      const dir = path.join(process.cwd(), "storage", "analytics");
      fs.mkdirSync(dir, { recursive: true });
      const day = new Date().toISOString().slice(0, 10);
      const file = path.join(dir, `events-${day}.jsonl`);
      fs.appendFileSync(file, `${JSON.stringify(row)}\n`, "utf8");
    } catch (err) {
      this.logger.warn(
        `analytics file skip: ${err instanceof Error ? err.message : "error"}`,
      );
    }
  }
}
