import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MembershipRole, PlanTier } from "@prisma/client";
import { PLAN_LIMITS as SHARED_PLAN_LIMITS } from "@ai-growth-os/shared";
import { createHmac, timingSafeEqual } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { primaryWebOrigin } from "../cors-origins";
import { UsageService } from "./usage.service";

const PLAN_LIMITS: Record<
  PlanTier,
  { sites: number; scansPerMonth: number; label: string; priceLabel: string }
> = {
  free: {
    sites: SHARED_PLAN_LIMITS.free.sites,
    scansPerMonth: SHARED_PLAN_LIMITS.free.scansPerMonth,
    label: SHARED_PLAN_LIMITS.free.label,
    priceLabel: SHARED_PLAN_LIMITS.free.priceLabel,
  },
  starter: {
    sites: SHARED_PLAN_LIMITS.starter.sites,
    scansPerMonth: SHARED_PLAN_LIMITS.starter.scansPerMonth,
    label: SHARED_PLAN_LIMITS.starter.label,
    priceLabel: SHARED_PLAN_LIMITS.starter.priceLabel,
  },
  agency: {
    sites: SHARED_PLAN_LIMITS.agency.sites,
    scansPerMonth: SHARED_PLAN_LIMITS.agency.scansPerMonth,
    label: SHARED_PLAN_LIMITS.agency.label,
    priceLabel: SHARED_PLAN_LIMITS.agency.priceLabel,
  },
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
    const razorpayConfigured = Boolean(
      this.config.get("RAZORPAY_KEY_ID") && this.config.get("RAZORPAY_KEY_SECRET"),
    );

    return {
      organizationId,
      plan,
      planLabel: limits.label,
      priceLabel: limits.priceLabel,
      razorpayConfigured,
      razorpayCustomerId: org.razorpayCustomerId,
      subscription: {
        id: sub.id,
        active: sub.active,
        razorpaySubscriptionId: sub.razorpaySubscriptionId,
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

    const keyId = this.config.get<string>("RAZORPAY_KEY_ID");
    const keySecret = this.config.get<string>("RAZORPAY_KEY_SECRET");
    const planStarter = this.config.get<string>("RAZORPAY_PLAN_STARTER");
    const planAgency = this.config.get<string>("RAZORPAY_PLAN_AGENCY");
    const webOrigin = primaryWebOrigin(
      this.config.get<string>("CORS_ORIGIN") ?? "http://localhost:3000",
    );

    if (!keyId || !keySecret) {
      await this.activatePlan(organizationId, plan, {
        razorpaySubscriptionId: `stub_sub_${plan}_${Date.now()}`,
      });
      return {
        mode: "stub" as const,
        url: `${webOrigin}/billing?billing=stub_activated&plan=${plan}`,
        message: "Razorpay not configured — plan activated in stub mode",
      };
    }

    const razorpayPlanId = plan === "agency" ? planAgency : planStarter;
    if (!razorpayPlanId) {
      // Keys work, but Subscriptions/plans often need Razorpay dashboard enablement.
      // Fall back to a one-time Payment Link so test checkout still opens.
      return this.createPaymentLinkCheckout(
        keyId,
        keySecret,
        organizationId,
        plan,
        webOrigin,
      );
    }

    let customerId = org.razorpayCustomerId;
    if (!customerId) {
      customerId = await this.razorpayCreateCustomer(
        keyId,
        keySecret,
        org.name,
        organizationId,
      );
      await this.prisma.organization.update({
        where: { id: organizationId },
        data: { razorpayCustomerId: customerId },
      });
    }

    const subscription = await this.razorpayRequest(
      keyId,
      keySecret,
      "POST",
      "/v1/subscriptions",
      {
        plan_id: razorpayPlanId,
        customer_id: customerId,
        total_count: 120,
        customer_notify: 1,
        notes: {
          organizationId,
          plan,
        },
      },
    );

    const shortUrl = subscription.short_url
      ? String(subscription.short_url)
      : `${webOrigin}/billing?billing=awaiting_payment&sub=${String(subscription.id)}`;

    return {
      mode: "razorpay" as const,
      url: shortUrl,
      subscriptionId: String(subscription.id),
      keyId,
    };
  }

  async confirmPaymentLink(
    userId: string,
    organizationId: string,
    paymentLinkId: string,
  ) {
    await this.requireRole(userId, organizationId, [MembershipRole.owner]);
    const keyId = this.config.get<string>("RAZORPAY_KEY_ID");
    const keySecret = this.config.get<string>("RAZORPAY_KEY_SECRET");
    if (!keyId || !keySecret) {
      throw new BadRequestException("razorpay_not_configured");
    }

    const link = await this.razorpayRequest(
      keyId,
      keySecret,
      "GET",
      `/v1/payment_links/${encodeURIComponent(paymentLinkId)}`,
    );
    const status = String(link.status ?? "");
    const notes = (link.notes ?? {}) as {
      organizationId?: string;
      plan?: string;
    };
    const orgId = String(notes.organizationId ?? organizationId);
    if (orgId !== organizationId) {
      throw new ForbiddenException("org_forbidden");
    }
    if (status !== "paid") {
      return { activated: false, status };
    }
    const plan = (notes.plan === "agency" ? "agency" : "starter") as PlanTier;
    await this.activatePlan(orgId, plan, {
      razorpaySubscriptionId: `plink_${paymentLinkId}`,
    });
    return { activated: true, status, plan };
  }

  private async createPaymentLinkCheckout(
    keyId: string,
    keySecret: string,
    organizationId: string,
    plan: PlanTier,
    webOrigin: string,
  ) {
    const amount = plan === "agency" ? 1_599_900 : 399_900;
    const brand = "growthOS";
    const link = await this.razorpayRequest(
      keyId,
      keySecret,
      "POST",
      "/v1/payment_links",
      {
        amount,
        currency: "INR",
        accept_partial: false,
        description: `${brand} ${PLAN_LIMITS[plan].label} plan`,
        customer: {
          name: brand,
        },
        notify: { sms: false, email: false },
        reminder_enable: false,
        notes: {
          organizationId,
          plan,
        },
        callback_url: `${webOrigin}/billing?billing=paid&plan=${plan}`,
        callback_method: "get",
        options: {
          checkout: {
            name: brand,
            description: `${PLAN_LIMITS[plan].label} · ${PLAN_LIMITS[plan].priceLabel}`,
          },
        },
      },
    );
    const shortUrl = String(link.short_url ?? "");
    if (!shortUrl) {
      throw new BadRequestException("razorpay_payment_link_failed");
    }
    return {
      mode: "razorpay_link" as const,
      url: shortUrl,
      paymentLinkId: String(link.id ?? ""),
      keyId,
      message:
        "Opened Razorpay test payment link (add RAZORPAY_PLAN_* for subscriptions)",
    };
  }

  async createPortal(userId: string, organizationId: string) {
    await this.requireRole(userId, organizationId, [MembershipRole.owner]);
    const org = await this.prisma.organization.findFirst({
      where: { id: organizationId, deletedAt: null },
    });
    if (!org) throw new NotFoundException("org_not_found");

    const keyId = this.config.get<string>("RAZORPAY_KEY_ID");
    const keySecret = this.config.get<string>("RAZORPAY_KEY_SECRET");
    const webOrigin = primaryWebOrigin(
      this.config.get<string>("CORS_ORIGIN") ?? "http://localhost:3000",
    );

    const active = await this.prisma.subscription.findFirst({
      where: { organizationId, active: true },
      orderBy: { createdAt: "desc" },
    });

    if (
      !keyId ||
      !keySecret ||
      !active?.razorpaySubscriptionId ||
      active.razorpaySubscriptionId.startsWith("stub_")
    ) {
      return {
        mode: "stub" as const,
        url: `${webOrigin}/billing`,
        message: "Razorpay portal unavailable in stub mode — manage plan via checkout",
      };
    }

    // Cancel at period end via Razorpay, then send user back to billing.
    try {
      await this.razorpayRequest(
        keyId,
        keySecret,
        "POST",
        `/v1/subscriptions/${active.razorpaySubscriptionId}/cancel`,
        { cancel_at_cycle_end: 1 },
      );
    } catch (err) {
      this.logger.warn(
        `razorpay cancel failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return {
      mode: "razorpay" as const,
      url: `${webOrigin}/billing?billing=cancel_requested`,
      message: "Cancellation requested at cycle end",
    };
  }

  async handleWebhook(rawBody: Buffer, signature: string | undefined) {
    const secret = this.config.get<string>("RAZORPAY_WEBHOOK_SECRET");
    if (!secret) {
      this.logger.warn("RAZORPAY_WEBHOOK_SECRET missing — accepting stub webhook");
    } else {
      if (!signature) throw new BadRequestException("missing_razorpay_signature");
      const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
      const a = Buffer.from(expected);
      const b = Buffer.from(signature);
      if (a.length !== b.length || !timingSafeEqual(a, b)) {
        throw new BadRequestException("invalid_razorpay_signature");
      }
    }

    const event = JSON.parse(rawBody.toString("utf8")) as {
      event?: string;
      payload?: {
        subscription?: { entity?: Record<string, unknown> };
        payment?: { entity?: Record<string, unknown> };
        payment_link?: { entity?: Record<string, unknown> };
      };
    };

    const type = event.event ?? "";
    const subEntity = event.payload?.subscription?.entity ?? {};
    const payEntity = event.payload?.payment?.entity ?? {};
    const linkEntity = event.payload?.payment_link?.entity ?? {};
    const notes =
      (subEntity.notes as { organizationId?: string; plan?: string } | undefined) ??
      (payEntity.notes as { organizationId?: string; plan?: string } | undefined) ??
      (linkEntity.notes as { organizationId?: string; plan?: string } | undefined) ??
      {};

    if (
      type === "subscription.activated" ||
      type === "subscription.charged" ||
      type === "subscription.authenticated"
    ) {
      const orgId = String(notes.organizationId ?? "");
      const plan = (notes.plan === "agency" ? "agency" : "starter") as PlanTier;
      const subId = typeof subEntity.id === "string" ? subEntity.id : undefined;
      if (orgId) {
        await this.activatePlan(orgId, plan, { razorpaySubscriptionId: subId });
      }
    }

    if (type === "payment_link.paid") {
      const orgId = String(notes.organizationId ?? "");
      const plan = (notes.plan === "agency" ? "agency" : "starter") as PlanTier;
      const linkId = typeof linkEntity.id === "string" ? linkEntity.id : undefined;
      if (orgId) {
        await this.activatePlan(orgId, plan, {
          razorpaySubscriptionId: linkId ? `plink_${linkId}` : undefined,
        });
      }
    }

    if (
      type === "subscription.cancelled" ||
      type === "subscription.completed" ||
      type === "subscription.halted"
    ) {
      const orgId = String(notes.organizationId ?? "");
      const customerId = String(subEntity.customer_id ?? "");
      let org =
        orgId
          ? await this.prisma.organization.findFirst({
              where: { id: orgId, deletedAt: null },
            })
          : null;
      if (!org && customerId) {
        org = await this.prisma.organization.findFirst({
          where: { razorpayCustomerId: customerId, deletedAt: null },
        });
      }
      if (org) {
        await this.activatePlan(org.id, "free", {});
      }
    }

    return { received: true };
  }

  private async activatePlan(
    organizationId: string,
    plan: PlanTier,
    opts: { razorpaySubscriptionId?: string; razorpayPlanId?: string },
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
        razorpaySubscriptionId: opts.razorpaySubscriptionId,
        razorpayPlanId: opts.razorpayPlanId,
        periodStart: now,
        periodEnd: end,
      },
    });
  }

  private async razorpayCreateCustomer(
    keyId: string,
    keySecret: string,
    name: string,
    organizationId: string,
  ) {
    const res = await this.razorpayRequest(keyId, keySecret, "POST", "/v1/customers", {
      name: name.slice(0, 50),
      notes: { organizationId },
      fail_existing: "0",
    });
    return String(res.id);
  }

  private async razorpayRequest(
    keyId: string,
    keySecret: string,
    method: "POST" | "GET",
    path: string,
    body?: Record<string, unknown>,
  ) {
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const res = await fetch(`https://api.razorpay.com${path}`, {
      method,
      headers: {
        Authorization: `Basic ${auth}`,
        ...(method === "POST"
          ? { "Content-Type": "application/json" }
          : {}),
      },
      body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
      signal: AbortSignal.timeout(20_000),
    });
    const json = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      this.logger.warn(`razorpay ${path} failed: ${JSON.stringify(json)}`);
      throw new BadRequestException("razorpay_request_failed");
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
