import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { MembershipRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class PilotMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string, organizationId: string) {
    await this.requireMembership(userId, organizationId);
    const org = await this.prisma.organization.findFirst({
      where: { id: organizationId, deletedAt: null },
    });
    if (!org) throw new NotFoundException("org_not_found");

    const sites = await this.prisma.site.findMany({
      where: { organizationId, deletedAt: null },
      select: { id: true },
    });
    const siteIds = sites.map((s) => s.id);
    const weekAgo = new Date(Date.now() - WEEK_MS);

    if (siteIds.length === 0) {
      return emptyMetrics(organizationId);
    }

    const [
      scansTotal,
      scansWeek,
      scansDone,
      proposalsTotal,
      proposalsApproved,
      deploymentsApply,
      deploymentsSucceeded,
      deploymentsFailed,
      rollbacks,
      auditActorsWeek,
    ] = await Promise.all([
      this.prisma.jobRun.count({ where: { siteId: { in: siteIds } } }),
      this.prisma.jobRun.count({
        where: { siteId: { in: siteIds }, createdAt: { gte: weekAgo } },
      }),
      this.prisma.jobRun.count({
        where: {
          siteId: { in: siteIds },
          status: { in: ["done", "awaiting_approval"] },
        },
      }),
      this.prisma.proposal.count({
        where: { siteId: { in: siteIds }, status: { not: "superseded" } },
      }),
      this.prisma.proposal.count({
        where: { siteId: { in: siteIds }, status: "approved" },
      }),
      this.prisma.deployment.count({
        where: { siteId: { in: siteIds }, action: "apply" },
      }),
      this.prisma.deployment.count({
        where: { siteId: { in: siteIds }, action: "apply", status: "succeeded" },
      }),
      this.prisma.deployment.count({
        where: { siteId: { in: siteIds }, action: "apply", status: "failed" },
      }),
      this.prisma.deployment.count({
        where: { siteId: { in: siteIds }, action: "rollback" },
      }),
      this.prisma.auditLog.findMany({
        where: {
          organizationId,
          createdAt: { gte: weekAgo },
          actorUserId: { not: null },
        },
        select: { actorUserId: true },
        distinct: ["actorUserId"],
      }),
    ]);

    const scanCompletionRate =
      scansTotal === 0 ? 100 : Math.round((scansDone / scansTotal) * 100);
    const approvalRate =
      proposalsTotal === 0
        ? 0
        : Math.round((proposalsApproved / proposalsTotal) * 100);
    const deploySuccessRate =
      deploymentsApply === 0
        ? 100
        : Math.round((deploymentsSucceeded / deploymentsApply) * 100);
    const rollbackRate =
      deploymentsSucceeded === 0
        ? 0
        : Math.round((rollbacks / deploymentsSucceeded) * 100);

    return {
      organizationId,
      generatedAt: new Date().toISOString(),
      sites: siteIds.length,
      scans: {
        total: scansTotal,
        thisWeek: scansWeek,
        completed: scansDone,
        completionRate: scanCompletionRate,
      },
      proposals: {
        total: proposalsTotal,
        approved: proposalsApproved,
        approvalRate,
      },
      deployments: {
        apply: deploymentsApply,
        succeeded: deploymentsSucceeded,
        failed: deploymentsFailed,
        rollbacks,
        successRate: deploySuccessRate,
        rollbackRate,
      },
      wau: auditActorsWeek.length,
      targets: {
        approvalRate: 60,
        deploySuccessRate: 95,
        note: "Beta targets from BETA-30-DAY.md",
      },
    };
  }

  private async requireMembership(userId: string, organizationId: string) {
    const m = await this.prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });
    if (
      !m ||
      ![MembershipRole.owner, MembershipRole.member].includes(m.role)
    ) {
      throw new ForbiddenException("org_forbidden");
    }
    return m;
  }
}

function emptyMetrics(organizationId: string) {
  return {
    organizationId,
    generatedAt: new Date().toISOString(),
    sites: 0,
    scans: { total: 0, thisWeek: 0, completed: 0, completionRate: 100 },
    proposals: { total: 0, approved: 0, approvalRate: 0 },
    deployments: {
      apply: 0,
      succeeded: 0,
      failed: 0,
      rollbacks: 0,
      successRate: 100,
      rollbackRate: 0,
    },
    wau: 0,
    targets: {
      approvalRate: 60,
      deploySuccessRate: 95,
      note: "Beta targets from BETA-30-DAY.md",
    },
  };
}
