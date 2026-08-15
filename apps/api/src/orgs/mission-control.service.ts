import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { scoreGrowthPillars } from "@ai-growth-os/shared";
import { MembershipRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class MissionControlService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(userId: string, organizationId: string) {
    await this.requireMembership(userId, organizationId);

    const org = await this.prisma.organization.findFirst({
      where: { id: organizationId, deletedAt: null },
    });
    if (!org) throw new NotFoundException("org_not_found");

    const sites = await this.prisma.site.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { updatedAt: "desc" },
    });
    const siteIds = sites.map((s) => s.id);
    const weekAgo = new Date(Date.now() - WEEK_MS);

    if (siteIds.length === 0) {
      return {
        organization: { id: org.id, name: org.name, plan: org.plan },
        kpis: {
          overallHealth: 0,
          healthDeltaWeek: 0,
          activeWebsites: 0,
          pendingProposals: 0,
          needsApproval: 0,
          deploying: 0,
          failedDeployments: 0,
          openIssues: 0,
        },
        growthPulse: {
          metaImprovements: 0,
          faqAdded: 0,
          issuesResolved: 0,
          deploymentSuccessRate: 100,
          rollbacks: 0,
          period: "this_week" as const,
        },
        activity: [],
        notifications: [],
        priorityTasks: [
          {
            id: "connect",
            label: "Connect your first website",
            href: "/sites/connect",
            urgency: "high" as const,
          },
        ],
        sites: [],
        quickActions: [
          { id: "connect", label: "Connect Website", href: "/sites/connect" },
        ],
        generatedAt: new Date().toISOString(),
      };
    }

    const [
      pendingProposals,
      deployingCount,
      failedDeployments,
      succeededWeek,
      rolledBackWeek,
      openIssues,
      metaFixesWeek,
      faqFixesWeek,
      resolvedIssuesWeek,
      recentProposals,
      recentDeployments,
      recentJobs,
    ] = await Promise.all([
      this.prisma.proposal.count({
        where: {
          siteId: { in: siteIds },
          status: "pending_review",
        },
      }),
      this.prisma.deployment.count({
        where: {
          siteId: { in: siteIds },
          action: "apply",
          status: { in: ["ready", "deploying", "verifying"] },
        },
      }),
      this.prisma.deployment.count({
        where: {
          siteId: { in: siteIds },
          action: "apply",
          status: "failed",
        },
      }),
      this.prisma.deployment.count({
        where: {
          siteId: { in: siteIds },
          action: "apply",
          status: "succeeded",
          completedAt: { gte: weekAgo },
        },
      }),
      this.prisma.deployment.count({
        where: {
          siteId: { in: siteIds },
          status: "rolled_back",
          completedAt: { gte: weekAgo },
        },
      }),
      this.prisma.issue.count({
        where: {
          jobRun: { siteId: { in: siteIds } },
          resolved: false,
        },
      }),
      this.prisma.deployment.count({
        where: {
          siteId: { in: siteIds },
          action: "apply",
          status: "succeeded",
          completedAt: { gte: weekAgo },
          patch: {
            proposal: {
              proposalType: { in: ["meta_title", "meta_description"] },
            },
          },
        },
      }),
      this.prisma.deployment.count({
        where: {
          siteId: { in: siteIds },
          action: "apply",
          status: "succeeded",
          completedAt: { gte: weekAgo },
          patch: { proposal: { proposalType: "faq_schema" } },
        },
      }),
      this.prisma.issue.count({
        where: {
          jobRun: { siteId: { in: siteIds } },
          resolved: true,
          createdAt: { gte: weekAgo },
        },
      }),
      this.prisma.proposal.findMany({
        where: { siteId: { in: siteIds } },
        orderBy: { createdAt: "desc" },
        take: 15,
        include: {
          site: { select: { domain: true } },
        },
      }),
      this.prisma.deployment.findMany({
        where: { siteId: { in: siteIds } },
        orderBy: { createdAt: "desc" },
        take: 15,
        include: {
          site: { select: { domain: true } },
          patch: {
            include: {
              proposal: { select: { proposalType: true } },
            },
          },
          events: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      }),
      this.prisma.jobRun.findMany({
        where: { siteId: { in: siteIds } },
        orderBy: { createdAt: "desc" },
        take: 15,
        include: {
          site: { select: { domain: true } },
          crawl: { select: { pageCount: true } },
          _count: { select: { issues: true } },
        },
      }),
    ]);

    const siteCards = await Promise.all(
      sites.map(async (site) => this.buildSiteCard(site)),
    );

    const healthScore = computeOrgHealth({
      siteCount: sites.length,
      openIssues,
      failedDeployments,
      pendingProposals,
      succeededWeek,
      connectedCount: sites.filter((s) => s.healthStatus === "healthy").length,
    });

    const deployAttemptsWeek = succeededWeek + rolledBackWeek + (
      await this.prisma.deployment.count({
        where: {
          siteId: { in: siteIds },
          action: "apply",
          status: "failed",
          completedAt: { gte: weekAgo },
        },
      })
    );
    const deploySuccessRate =
      deployAttemptsWeek === 0
        ? 100
        : Math.round((succeededWeek / deployAttemptsWeek) * 100);

    const activity = buildActivityFeed({
      proposals: recentProposals,
      deployments: recentDeployments,
      jobs: recentJobs,
    }).slice(0, 20);

    const notifications = buildNotifications({
      pendingProposals,
      failedDeployments,
      deployingCount,
      recentDeployments,
    });

    const priorityTasks = buildPriorityTasks({
      pendingProposals,
      failedDeployments,
      openIssues,
      sitesWithoutScan: siteCards.filter((s) => !s.lastScanAt).length,
      connectedSites: siteCards.filter((s) => s.connected).length,
    });

    return {
      organization: {
        id: org.id,
        name: org.name,
        plan: org.plan,
      },
      kpis: {
        overallHealth: healthScore.score,
        healthDeltaWeek: healthScore.deltaHint,
        activeWebsites: sites.length,
        pendingProposals,
        needsApproval: pendingProposals,
        deploying: deployingCount,
        failedDeployments,
        openIssues,
      },
      growthPulse: {
        metaImprovements: metaFixesWeek,
        faqAdded: faqFixesWeek,
        issuesResolved: resolvedIssuesWeek,
        deploymentSuccessRate: deploySuccessRate,
        rollbacks: rolledBackWeek,
        period: "this_week" as const,
      },
      activity,
      notifications,
      priorityTasks,
      sites: siteCards,
      quickActions: [
        { id: "connect", label: "Connect Website", href: "/sites/connect" },
        { id: "scan", label: "Run Scan", href: null, requiresSite: true },
        {
          id: "proposals",
          label: "Review Proposals",
          href: pendingProposals > 0 ? null : "/dashboard",
          count: pendingProposals,
        },
        {
          id: "deploy",
          label: "Deploy Approved",
          href: null,
          requiresSite: true,
        },
      ],
      generatedAt: new Date().toISOString(),
    };
  }

  async search(userId: string, organizationId: string, q: string) {
    await this.requireMembership(userId, organizationId);
    const query = q.trim().slice(0, 80);
    if (query.length < 2) {
      return { query, results: [] as SearchHit[] };
    }

    const sites = await this.prisma.site.findMany({
      where: { organizationId, deletedAt: null },
      select: { id: true },
    });
    const siteIds = sites.map((s) => s.id);
    const contains = { contains: query, mode: "insensitive" as const };

    const [siteHits, proposalHits, deploymentHits, issueHits] =
      await Promise.all([
        this.prisma.site.findMany({
          where: {
            organizationId,
            deletedAt: null,
            domain: contains,
          },
          take: 8,
        }),
        this.prisma.proposal.findMany({
          where: {
            siteId: { in: siteIds },
            OR: [
              { afterValue: contains },
              { proposalType: contains },
              { businessImpact: contains },
            ],
          },
          take: 8,
          include: { site: { select: { domain: true } } },
        }),
        this.prisma.deployment.findMany({
          where: {
            siteId: { in: siteIds },
            OR: [
              { status: contains },
              { errorMessage: contains },
              { id: { equals: query } },
            ],
          },
          take: 8,
          include: {
            site: { select: { domain: true } },
            patch: {
              include: { proposal: { select: { proposalType: true } } },
            },
          },
        }),
        this.prisma.issue.findMany({
          where: {
            jobRun: { siteId: { in: siteIds } },
            OR: [{ issueType: contains }],
          },
          take: 8,
          include: {
            jobRun: { include: { site: { select: { domain: true, id: true } } } },
            page: { select: { url: true } },
          },
        }),
      ]);

    const results: SearchHit[] = [
      ...siteHits.map((s) => ({
        type: "site" as const,
        id: s.id,
        title: s.domain,
        subtitle: s.connectionType,
        href: `/sites/${s.id}`,
      })),
      ...proposalHits.map((p) => ({
        type: "proposal" as const,
        id: p.id,
        title: p.proposalType.replace(/_/g, " "),
        subtitle: `${p.site.domain} · ${p.status}`,
        href: `/sites/${p.siteId}`,
      })),
      ...deploymentHits.map((d) => ({
        type: "deployment" as const,
        id: d.id,
        title: `${d.action} · ${d.patch.proposal?.proposalType?.replace(/_/g, " ") ?? "patch"}`,
        subtitle: `${d.site.domain} · ${d.status}`,
        href: `/deployments/${d.id}`,
      })),
      ...issueHits.map((i) => ({
        type: "issue" as const,
        id: i.id,
        title: i.issueType,
        subtitle: i.jobRun.site.domain,
        href: `/sites/${i.jobRun.site.id}`,
      })),
    ];

    return { query, results: results.slice(0, 24) };
  }

  private async buildSiteCard(site: {
    id: string;
    domain: string;
    connectionType: string;
    healthStatus: string | null;
    updatedAt: Date;
    settings: unknown;
  }) {
    const latestJob = await this.prisma.jobRun.findFirst({
      where: { siteId: site.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { issues: true } },
      },
    });

    const pending = await this.prisma.proposal.count({
      where: { siteId: site.id, status: "pending_review" },
    });

    const deploymentsToday = await this.prisma.deployment.count({
      where: {
        siteId: site.id,
        action: "apply",
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    });

    const openIssueRows = latestJob
      ? await this.prisma.issue.findMany({
          where: { jobRunId: latestJob.id, resolved: false },
          select: { issueType: true, severity: true },
        })
      : [];

    const openIssues = openIssueRows.length;
    const criticalIssues = openIssueRows.filter((i) =>
      ["critical", "high"].includes(i.severity),
    ).length;

    const connected = site.healthStatus === "healthy";

    const pillars = scoreGrowthPillars(
      openIssueRows.map((i) => i.issueType),
      { connected },
    );

    let health = pillars.overall;
    if (!latestJob?.createdAt) health = Math.max(5, health - 15);
    else {
      const ageH = (Date.now() - latestJob.createdAt.getTime()) / 36e5;
      if (ageH > 24 * 14) health = Math.max(5, health - 10);
      else if (ageH > 24 * 7) health = Math.max(5, health - 4);
    }
    if (pending > 0) health = Math.max(5, health - 2);

    return {
      id: site.id,
      domain: site.domain,
      connectionType: site.connectionType,
      healthStatus: site.healthStatus,
      connected,
      health,
      seo: pillars.seo,
      aeo: pillars.aeo,
      geo: pillars.geo,
      aiVisibility: pillars.aiVisibility,
      pending,
      deploymentsToday,
      openIssues,
      criticalIssues,
      lastScanAt: latestJob?.createdAt?.toISOString() ?? null,
      lastJobStatus: latestJob?.status ?? null,
      lastJobId: latestJob?.id ?? null,
    };
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

type SearchHit = {
  type: "site" | "proposal" | "deployment" | "issue";
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

function computeOrgHealth(opts: {
  siteCount: number;
  openIssues: number;
  failedDeployments: number;
  pendingProposals: number;
  succeededWeek: number;
  connectedCount: number;
}) {
  if (opts.siteCount === 0) {
    return { score: 0, deltaHint: 0 };
  }
  let score = 72;
  score += Math.min(12, opts.connectedCount * 3);
  score += Math.min(10, opts.succeededWeek * 2);
  score -= Math.min(25, opts.openIssues * 2);
  score -= opts.failedDeployments * 8;
  score -= Math.min(8, Math.floor(opts.pendingProposals / 3));
  score = clamp(score, 8, 99);
  // Soft “this week” hint — positive when deploys succeeded
  const deltaHint = clamp(opts.succeededWeek * 2 - opts.failedDeployments * 3, -12, 15);
  return { score, deltaHint };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function buildActivityFeed(opts: {
  proposals: Array<{
    id: string;
    siteId: string;
    status: string;
    proposalType: string;
    createdAt: Date;
    updatedAt: Date;
    site: { domain: string };
  }>;
  deployments: Array<{
    id: string;
    siteId: string;
    action: string;
    status: string;
    createdAt: Date;
    completedAt: Date | null;
    site: { domain: string };
    patch: { proposal: { proposalType: string } | null };
  }>;
  jobs: Array<{
    id: string;
    siteId: string;
    status: string;
    createdAt: Date;
    finishedAt: Date | null;
    site: { domain: string };
    _count: { issues: number };
  }>;
}) {
  type Item = {
    id: string;
    at: string;
    label: string;
    kind: string;
    href: string;
    domain: string;
    ok: boolean;
  };

  const items: Item[] = [];

  for (const j of opts.jobs) {
    const done = ["done", "awaiting_approval", "failed"].includes(j.status);
    items.push({
      id: `job-${j.id}`,
      at: (j.finishedAt ?? j.createdAt).toISOString(),
      label:
        j.status === "failed"
          ? "Scan failed"
          : j.status === "awaiting_approval"
            ? "Scan completed — proposals ready"
            : j.status === "done"
              ? "Scan completed"
              : `Scan ${j.status}`,
      kind: "scan",
      href: `/job-runs/${j.id}`,
      domain: j.site.domain,
      ok: j.status !== "failed",
    });
  }

  for (const p of opts.proposals) {
    if (p.status === "pending_review") {
      items.push({
        id: `prop-${p.id}-pending`,
        at: p.createdAt.toISOString(),
        label: `Proposal generated · ${p.proposalType.replace(/_/g, " ")}`,
        kind: "proposal",
        href: `/sites/${p.siteId}`,
        domain: p.site.domain,
        ok: true,
      });
    }
    if (p.status === "approved") {
      items.push({
        id: `prop-${p.id}-approved`,
        at: p.updatedAt.toISOString(),
        label: `Approved · ${p.proposalType.replace(/_/g, " ")}`,
        kind: "approval",
        href: `/sites/${p.siteId}`,
        domain: p.site.domain,
        ok: true,
      });
    }
  }

  for (const d of opts.deployments) {
    const type = d.patch.proposal?.proposalType?.replace(/_/g, " ") ?? "change";
    let label = `Deployment ${d.status}`;
    if (d.status === "succeeded" && d.action === "apply") {
      label = `Verification passed · ${type}`;
    } else if (d.status === "rolled_back") {
      label = `Rolled back · ${type}`;
    } else if (d.status === "failed") {
      label = `Deployment failed · ${type}`;
    } else if (d.action === "rollback" && d.status === "succeeded") {
      label = `Rollback completed · ${type}`;
    } else if (["deploying", "verifying", "ready"].includes(d.status)) {
      label = `Deploying · ${type}`;
    }
    items.push({
      id: `dep-${d.id}`,
      at: (d.completedAt ?? d.createdAt).toISOString(),
      label,
      kind: "deployment",
      href: `/deployments/${d.id}`,
      domain: d.site.domain,
      ok: !["failed", "rolled_back"].includes(d.status) || d.action === "rollback",
    });
  }

  return items.sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );
}

function buildNotifications(opts: {
  pendingProposals: number;
  failedDeployments: number;
  deployingCount: number;
  recentDeployments: Array<{
    id: string;
    status: string;
    action: string;
    site: { domain: string };
  }>;
}) {
  const notes: Array<{
    id: string;
    severity: "info" | "warning" | "error" | "success";
    title: string;
    body: string;
    href: string;
  }> = [];

  if (opts.pendingProposals > 0) {
    notes.push({
      id: "pending-proposals",
      severity: "warning",
      title: `${opts.pendingProposals} proposal${opts.pendingProposals === 1 ? "" : "s"} need approval`,
      body: "Review before/after and approve safe fixes.",
      href: "/dashboard#priority",
    });
  }

  const failed = opts.recentDeployments.find(
    (d) => d.status === "failed" && d.action === "apply",
  );
  if (failed) {
    notes.push({
      id: `fail-${failed.id}`,
      severity: "error",
      title: "Verification or deploy failed",
      body: `${failed.site.domain} — open Mission Timeline`,
      href: `/deployments/${failed.id}`,
    });
  }

  const rolled = opts.recentDeployments.find((d) => d.status === "rolled_back");
  if (rolled) {
    notes.push({
      id: `rb-${rolled.id}`,
      severity: "success",
      title: "Rollback completed",
      body: `${rolled.site.domain} restored from backup`,
      href: `/deployments/${rolled.id}`,
    });
  }

  if (opts.deployingCount > 0) {
    notes.push({
      id: "deploying",
      severity: "info",
      title: `${opts.deployingCount} deployment${opts.deployingCount === 1 ? "" : "s"} in progress`,
      body: "AI is applying and verifying changes.",
      href: "/dashboard#activity",
    });
  }

  return notes.slice(0, 6);
}

function buildPriorityTasks(opts: {
  pendingProposals: number;
  failedDeployments: number;
  openIssues: number;
  sitesWithoutScan: number;
  connectedSites: number;
}) {
  const tasks: Array<{
    id: string;
    label: string;
    href: string;
    urgency: "high" | "medium" | "low";
  }> = [];

  if (opts.pendingProposals > 0) {
    tasks.push({
      id: "approve",
      label: `Approve ${opts.pendingProposals} proposal${opts.pendingProposals === 1 ? "" : "s"}`,
      href: "/dashboard#sites",
      urgency: "high",
    });
  }
  if (opts.failedDeployments > 0) {
    tasks.push({
      id: "failed",
      label: `Review ${opts.failedDeployments} failed deployment${opts.failedDeployments === 1 ? "" : "s"}`,
      href: "/dashboard#activity",
      urgency: "high",
    });
  }
  if (opts.openIssues > 0) {
    tasks.push({
      id: "issues",
      label: `Review ${opts.openIssues} open issue${opts.openIssues === 1 ? "" : "s"}`,
      href: "/dashboard#sites",
      urgency: "medium",
    });
  }
  if (opts.sitesWithoutScan > 0) {
    tasks.push({
      id: "scan",
      label: `Run first scan on ${opts.sitesWithoutScan} site${opts.sitesWithoutScan === 1 ? "" : "s"}`,
      href: "/dashboard#sites",
      urgency: "medium",
    });
  }
  if (opts.connectedSites === 0) {
    tasks.push({
      id: "connect",
      label: "Connect your first website",
      href: "/sites/connect",
      urgency: "high",
    });
  }
  if (tasks.length === 0) {
    tasks.push({
      id: "all-clear",
      label: "All clear — run a weekly scan to stay ahead",
      href: "/dashboard#sites",
      urgency: "low",
    });
  }
  return tasks;
}
