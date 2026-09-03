import type { Metadata } from "next";
import { PLAN_LIMITS } from "@ai-growth-os/shared";
import { MarketingShell } from "@/components/landing/MarketingShell";
import { BrandText } from "@/components/BrandText";
import { BRAND_NAME, getSiteUrl } from "@/lib/site";

const site = getSiteUrl();

export const metadata: Metadata = {
  title: `Pricing — ${BRAND_NAME}`,
  description: `${BRAND_NAME} pricing: Free (2 sites / 20 scans), Starter ₹3,999/mo (10 sites / 200 scans), Agency ₹15,999/mo (50 sites / 2,000 scans). Approve before write, verify & rollback.`,
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: `${BRAND_NAME} pricing`,
    description:
      "Exact limits: Free 2 sites / 20 scans · Starter 10 / 200 · Agency 50 / 2,000. Start free, upgrade when caps hurt.",
    url: `${site}/pricing`,
    type: "website",
  },
};

const PLANS = [
  {
    id: "free" as const,
    highlight: false,
    blurb: "Prove the loop on your own sites.",
    extras: [
      "SEO · AEO · GEO issue scan",
      "Approve before write",
      "WordPress verify & rollback",
    ],
    cta: { href: "/signup", label: "Start free" },
  },
  {
    id: "starter" as const,
    highlight: true,
    blurb: "For growing teams shipping fixes weekly.",
    extras: [
      "Mission Timeline for clients",
      "GitHub PR + ZIP fix packs",
      "Priority beta support",
    ],
    cta: { href: "/signup", label: "Start with Free, upgrade later" },
  },
  {
    id: "agency" as const,
    highlight: false,
    blurb: "Multi-client workspaces at agency scale.",
    extras: [
      "Team seats (workspace)",
      "Client-ready audit trail",
      "Best for WP portfolios",
    ],
    cta: { href: "/#beta", label: "Request agency access" },
  },
] as const;

export default function PricingPage() {
  return (
    <MarketingShell path="/pricing">
      <section className="land-section" style={{ paddingTop: 48 }}>
        <p className="land-kicker">Pricing</p>
        <h1 className="land-h2">Pay for execution, not another report</h1>
        <p className="land-lead">
          Exact site and scan caps from the product — same numbers the API enforces.
        </p>

        <div className="land-plan-grid" style={{ marginTop: 40 }}>
          {PLANS.map((plan) => {
            const limits = PLAN_LIMITS[plan.id];
            return (
              <article
                key={plan.id}
                className={`land-plan${plan.highlight ? " is-featured" : ""}`}
              >
                {plan.highlight ? (
                  <p className="land-plan-badge">Most teams start here</p>
                ) : null}
                <h2 className="land-plan-name">{limits.label}</h2>
                <p className="land-plan-price">
                  <span>
                    {plan.id === "free"
                      ? "₹0"
                      : `₹${limits.priceInr.toLocaleString("en-IN")}`}
                  </span>
                  <small>{plan.id === "free" ? "private beta" : "/ month"}</small>
                </p>
                <p className="land-plan-blurb">{plan.blurb}</p>
                <ul className="land-plan-features">
                  <li>
                    <strong>{limits.sites} sites</strong>
                  </li>
                  <li>
                    <strong>
                      {limits.scansPerMonth.toLocaleString("en-IN")} scans / month
                    </strong>
                  </li>
                  {plan.extras.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <a
                  className={
                    plan.highlight ? "land-btn-primary" : "land-btn-ghost"
                  }
                  href={plan.cta.href}
                  style={{ marginTop: 8, justifyContent: "center" }}
                >
                  <span>{plan.cta.label}</span>
                </a>
              </article>
            );
          })}
        </div>

        <div className="land-section" style={{ paddingLeft: 0, paddingRight: 0 }}>
          <p className="land-kicker">60-second demo</p>
          <h2 className="land-h2">See the trust loop</h2>
          <p className="land-lead">
            Connect → scan → approve → deploy → verify → rollback.
          </p>
          <video
            className="land-demo-video"
            controls
            playsInline
            preload="metadata"
            poster="/demo/growthos-loop-poster.jpg"
          >
            <source src="/demo/growthos-loop.mp4" type="video/mp4" />
            Your browser does not support the video tag.{" "}
            <a href="/demo/growthos-loop.mp4">Download the demo</a>.
          </video>
        </div>

        <p className="land-lead" style={{ marginTop: 24 }}>
          Honest beta note: paid checkout opens when Razorpay keys are set. Until
          then, Free gets you into the product loop.
        </p>

        <div style={{ marginTop: 56 }}>
          <h2 className="land-h2">What customers actually buy</h2>
          <ul className="land-trust-list" style={{ marginTop: 24 }}>
            <li>Confidence that AI won&apos;t silently break a live site</li>
            <li>Speed from issue → approved change → verified live HTML</li>
            <li>A timeline you can show a client or founder</li>
            <li>One loop for SEO, AEO, and GEO — not three tool stacks</li>
          </ul>
        </div>

        <div className="land-cta-row" style={{ marginTop: 40 }}>
          <a className="land-btn-primary" href="/signup">
            <span>Create free account</span>
          </a>
          <a className="land-btn-ghost" href="/compare">
            Compare vs SEO tools
          </a>
        </div>
      </section>
    </MarketingShell>
  );
}
