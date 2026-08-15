import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export type UsageMetric = "scan" | "ai_generation" | "site_active" | "deployment";

@Injectable()
export class UsageService {
  constructor(private readonly prisma: PrismaService) {}

  async record(
    organizationId: string,
    metric: UsageMetric,
    opts?: { quantity?: number; meta?: Record<string, unknown> },
  ) {
    await this.prisma.usageEvent.create({
      data: {
        organizationId,
        metric,
        quantity: opts?.quantity ?? 1,
        meta: (opts?.meta ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  async summary(organizationId: string, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await this.prisma.usageEvent.groupBy({
      by: ["metric"],
      where: { organizationId, occurredAt: { gte: since } },
      _sum: { quantity: true },
      _count: true,
    });
    const byMetric: Record<string, { quantity: number; events: number }> = {};
    for (const r of rows) {
      byMetric[r.metric] = {
        quantity: Number(r._sum.quantity ?? 0),
        events: r._count,
      };
    }
    return { periodDays: days, since: since.toISOString(), byMetric };
  }
}
