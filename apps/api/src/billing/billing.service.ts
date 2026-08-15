import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MembershipRole, PlanTier } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { UsageService } from "./usage.service";

const PLAN_LIMITS: Record<
  PlanTier,
  { sites: number; scansPerMonth: number; label: string; priceLabel: string }
> = {
  free: { sites: 2, scansPerMonth: 20, label: "Free", priceLabel: "$0" },
  starter: { sites: 10, scansPerMonth: 200, label: "Starter", priceLabel: "$49/mo" },
  agency: { sites: 50, scansPerMonth: 2000, label: "Agency", priceLabel: "$199/mo" },
};

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly usage: UsageService,
  ) {}

  async getSummary(userId: string, organizationId: string) {
    await this.requireMembership(userId, organizationId);
    const org = await this.prisma.organization.findFirst({
      where: { id: organizationId, deletedAt: null },
    });
    if (!org) throw new NotFoundException("org_not_found");

    let sub = await this.prisma.subscription.findFirst({
      where: { organizationId, active: true },
      orderBy: { createdAt: "desc" },
    });
    if (!sub) {
      sub = await this.prisma.subscription.create({
        data: {
          organizationId,
          plan: org.plan,
          active: true,
        },
      });
    }

    const usage = await this.usage.summary(organizationId, 30);
    const siteCount = await this.prisma.site.count({
      where: { organizationId, deletedAt: null },
    });
    const plan = sub.plan;
    const limits = PLAN_LIMITS[plan];

    return {
      organizationId,
      plan,
      planLabel: limits.label,
      priceLabel: limits.priceLabel,
      stripeConfigured: Boolean(this.config.get("STRIPE_SECRET_KEY")),
      stripeCustomerId: org.stripeCustomerId,
      subscription: {
        id: sub.id,
        active: sub.active,
        stripeSubscriptionId: sub.stripeSubscriptionId,
        periodStart: sub.periodStart,
        periodEnd: sub.periodEnd,
      },
      limits,
      usage: {
        ...usage,
        sites: siteCount,
        scansThisPeriod: usage.byMetric.scan?.quantity ?? 0,
      },
      plans: Object.entries(PLAN_LIMITS).map(([id, v]) => ({
        id,
        ...v,
      })),
    };
  }

  async createCheckout(userId: string, organizationId: string, plan: PlanTier) {
    await this.requireRole(userId, organizationId, [MembershipRole.owner]);
    if (plan === "free") {
      throw new BadRequestException("checkout_not_needed_for_free");
    }

    const org = await this.prisma.organization.findFirst({
      where: { id: organizationId, deletedAt: null },
    });
    if (!org) throw new NotFoundException("org_not_found");

    const secret = this.config.get<string>("STRIPE_SECRET_KEY");
    const priceStarter = this.config.get<string>("STRIPE_PRICE_STARTER");
    const priceAgency = this.config.get<string>("STRIPE_PRICE_AGENCY");
    const webOrigin = this.config.get<string>("CORS_ORIGIN") ?? "http://localhost:3000";

    if (!secret) {
      // Stub: activate plan locally without Stripe
      await this.activatePlan(organizationId, plan, {
        stripeSubscriptionId: `stub_sub_${plan}_${Date.now()}`,
      });
      return {
        mode: "stub" as const,
        url: `${webOrigin}/dashboard?billing=stub_activated&plan=${plan}`,
        message: "Stripe not configured — plan activated in stub mode",
      };
    }

    const priceId = plan === "agency" ? priceAgency : priceStarter;
    if (!priceId) {
      throw new BadRequestException("stripe_price_not_configured");
    }

    let customerId = org.stripeCustomerId;
    if (!customerId) {
      customerId = await this.stripeCreateCustomer(secret, org.name, organizationId);
      await this.prisma.organization.update({
        where: { id: organizationId },
        data: { stripeCustomerId: customerId },
      });
    }

    const session = await this.stripeRequest(secret, "POST", "/v1/checkout/sessions", {
      mode: "subscription",
      customer: customerId,
      success_url: `${webOrigin}/dashboard?billing=success`,
      cancel_url: `${webOrigin}/dashboard?billing=cancel`,
      line_items: [{ price: priceId, quantity: "1" }],
      client_reference_id: organizationId,
      metadata: { organizationId, plan },
    });

    return {
      mode: "stripe" as const,
      url: String(session.url),
      sessionId: String(session.id),
    };
  }

  async createPortal(userId: string, organizationId: string) {
    await this.requireRole(userId, organizationId, [MembershipRole.owner]);
    const org = await this.prisma.organization.findFirst({
      where: { id: organizationId, deletedAt: null },
    });
    if (!org) throw new NotFoundException("org_not_found");

    const secret = this.config.get<string>("STRIPE_SECRET_KEY");
    const webOrigin = this.config.get<string>("CORS_ORIGIN") ?? "http://localhost:3000";

    if (!secret || !org.stripeCustomerId) {
      return {
        mode: "stub" as const,
        url: `${webOrigin}/dashboard#billing`,
        message: "Stripe portal unavailable in stub mode — manage plan via checkout stub",
      };
    }

    const session = await this.stripeRequest(secret, "POST", "/v1/billing_portal/sessions", {
      customer: org.stripeCustomerId,
      return_url: `${webOrigin}/dashboard#billing`,
    });

    return { mode: "stripe" as const, url: String(session.url) };
  }

  async handleWebhook(rawBody: Buffer, signature: string | undefined) {
    const secret = this.config.get<string>("STRIPE_WEBHOOK_SECRET");
    if (!secret) {
      this.logger.warn("STRIPE_WEBHOOK_SECRET missing — accepting stub webhook");
    } else if (!signature) {
      throw new BadRequestException("missing_stripe_signature");
    }
    // Signature verification requires stripe SDK; for stub we parse JSON only.
    const event = JSON.parse(rawBody.toString("utf8")) as {
      type?: string;
      data?: { object?: Record<string, unknown> };
    };

    const type = event.type ?? "";
    const obj = event.data?.object ?? {};

    if (type === "checkout.session.completed") {
      const orgId = String(obj.client_reference_id ?? obj.metadata && (obj.metadata as { organizationId?: string }).organizationId ?? "");
      const plan = ((obj.metadata as { plan?: string } | undefined)?.plan ?? "starter") as PlanTier;
      const subId = typeof obj.subscription === "string" ? obj.subscription : undefined;
      if (orgId) {
        await this.activatePlan(orgId, plan === "agency" ? "agency" : "starter", {
          stripeSubscriptionId: subId,
        });
      }
    }

    if (type === "customer.subscription.deleted") {
      const customerId = String(obj.customer ?? "");
      const org = await this.prisma.organization.findFirst({
        where: { stripeCustomerId: customerId, deletedAt: null },
      });
      if (org) {
        await this.activatePlan(org.id, "free", {});
      }
    }

    return { received: true };
  }

  private async activatePlan(
    organizationId: string,
    plan: PlanTier,
    opts: { stripeSubscriptionId?: string },
  ) {
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { plan },
    });
    await this.prisma.subscription.updateMany({
      where: { organizationId, active: true },
      data: { active: false },
    });
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + 30);
    await this.prisma.subscription.create({
      data: {
        organizationId,
        plan,
        active: true,
        stripeSubscriptionId: opts.stripeSubscriptionId,
        periodStart: now,
        periodEnd: end,
      },
    });
  }

  private async stripeCreateCustomer(secret: string, name: string, organizationId: string) {
    const res = await this.stripeRequest(secret, "POST", "/v1/customers", {
      name,
      metadata: { organizationId },
    });
    return String(res.id);
  }

  private async stripeRequest(
    secret: string,
    method: "POST",
    path: string,
    body: Record<string, unknown>,
  ) {
    const params = new URLSearchParams();
    flattenStripe(body, params);
    const res = await fetch(`https://api.stripe.com${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
      signal: AbortSignal.timeout(20_000),
    });
    const json = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      this.logger.warn(`stripe ${path} failed: ${JSON.stringify(json)}`);
      throw new BadRequestException("stripe_request_failed");
    }
    return json;
  }

  private async requireMembership(userId: string, organizationId: string) {
    const m = await this.prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });
    if (!m) throw new ForbiddenException("org_forbidden");
    return m;
  }

  private async requireRole(
    userId: string,
    organizationId: string,
    roles: MembershipRole[],
  ) {
    const m = await this.requireMembership(userId, organizationId);
    if (!roles.includes(m.role)) throw new ForbiddenException("owner_required");
    return m;
  }
}

function flattenStripe(
  obj: Record<string, unknown>,
  params: URLSearchParams,
  prefix = "",
) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}[${k}]` : k;
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (item && typeof item === "object") {
          flattenStripe(item as Record<string, unknown>, params, `${key}[${i}]`);
        } else {
          params.append(`${key}[${i}]`, String(item));
        }
      });
    } else if (typeof v === "object") {
      flattenStripe(v as Record<string, unknown>, params, key);
    } else {
      params.append(key, String(v));
    }
  }
}
