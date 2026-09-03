import type { Metadata } from "next";
import { MarketingShell } from "@/components/landing/MarketingShell";
import { BrandText } from "@/components/BrandText";
import { BRAND_NAME, getSiteUrl } from "@/lib/site";

const site = getSiteUrl();

export const metadata: Metadata = {
  title: `Pricing — ${BRAND_NAME}`,
  description: `${BRAND_NAME} pricing: Free beta (2 sites), Starter ₹3,999/mo, Agency ₹15,999/mo. Approve SEO/AEO/GEO fixes before write, with verify & rollback.`,
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: `${BRAND_NAME} pricing`,
    description:
      "Start free. Upgrade when you need more sites and scans — built for agencies and founders who ship safe on-site changes.",
    url: `${site}/pricing`,
    type: "website",
  },
};

const PLANS = [
  {
    name: "Free",
    price: "₹0",
    period: "private beta",
    highlight: false,
    blurb: "Prove the loop on your own sites.",
    features: [
      "2 sites",
      "Capped monthly scans",
      "SEO · AEO · GEO issue scan",
      "Approve before write",
      "WordPress verify & rollback",
    ],
    cta: { href: "/signup", label: "Start free" },
  },
  {
    name: "Starter",
    price: "₹3,999",
    period: "/ month",
    highlight: true,
    blurb: "For growing teams shipping fixes weekly.",
    features: [
      "Higher site limits",
      "Higher monthly scans",
      "Mission Timeline for clients",
      "GitHub PR + ZIP fix packs",
      "Priority beta support",
    ],
    cta: { href: "/signup", label: "Start with Free, upgrade later" },
  },
  {
    name: "Agency",
    price: "₹15,999",
    period: "/ month",
    highlight: false,
    blurb: "Multi-client workspaces at agency scale.",
    features: [
      "Agency-scale site caps",
      "High scan volume",
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
          <BrandText /> is priced for teams who connect a site, approve fixes, and
          ship — with verify &amp; rollback where it matters.
        </p>

        <div className="land-plan-grid" style={{ marginTop: 40 }}>
          {PLANS.map((plan) => (
            <article
              key={plan.name}
              className={`land-plan${plan.highlight ? " is-featured" : ""}`}
            >
              {plan.highlight ? (
                <p className="land-plan-badge">Most teams start here</p>
              ) : null}
              <h2 className="land-plan-name">{plan.name}</h2>
              <p className="land-plan-price">
                <span>{plan.price}</span>
                <small>{plan.period}</small>
              </p>
              <p className="land-plan-blurb">{plan.blurb}</p>
              <ul className="land-plan-features">
                {plan.features.map((f) => (
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
          ))}
        </div>

        <p className="land-lead" style={{ marginTop: 40 }}>
          Honest beta note: paid checkout is available when Razorpay keys are set.
          Until then, Free gets you into the product loop. Limits may tighten as we
          learn from real usage.
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
          <a className="land-btn-ghost" href="/seo-aeo-geo">
            Understand SEO · AEO · GEO
          </a>
        </div>
      </section>
    </MarketingShell>
  );
}
