import type { Metadata } from "next";
import { MarketingShell } from "@/components/landing/MarketingShell";
import { BrandText } from "@/components/BrandText";
import { BRAND_NAME, getSiteUrl, SITE_TAGLINE } from "@/lib/site";

const site = getSiteUrl();

export const metadata: Metadata = {
  title: `Pricing — ${BRAND_NAME}`,
  description: `${BRAND_NAME} pricing: Free beta, Starter ₹3,999/mo, Agency ₹15,999/mo. Scan sites, approve AI SEO/AEO/GEO fixes, deploy with verify & rollback.`,
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: `${BRAND_NAME} pricing`,
    description: SITE_TAGLINE,
    url: `${site}/pricing`,
    type: "website",
  },
};

const PLANS = [
  {
    name: "Free",
    price: "₹0",
    detail: "2 sites · capped scans · private beta",
    cta: { href: "/signup", label: "Create account" },
  },
  {
    name: "Starter",
    price: "₹3,999 / month",
    detail: "Higher site + scan limits for growing teams",
    cta: { href: "/#beta", label: "Join beta" },
  },
  {
    name: "Agency",
    price: "₹15,999 / month",
    detail: "Agency-scale caps for multi-client workspaces",
    cta: { href: "/#beta", label: "Request access" },
  },
] as const;

export default function PricingPage() {
  return (
    <MarketingShell path="/pricing">
      <section className="land-section" style={{ paddingTop: 48 }}>
        <p className="land-kicker">Pricing</p>
        <h1 className="land-h2">Simple plans. Beta is free.</h1>
        <p className="land-lead">
          <BrandText /> helps agencies and founders run SEO · AEO · GEO fixes with
          approve → deploy → verify → rollback — not another audit PDF.
        </p>

        <div className="land-price-row" style={{ marginTop: 40 }}>
          {PLANS.map((plan) => (
            <div key={plan.name} className="land-price-item">
              <strong>{plan.name}</strong>
              <span>{plan.price}</span>
              <p className="land-lead" style={{ marginTop: 12, marginBottom: 0 }}>
                {plan.detail}
              </p>
              <p style={{ marginTop: 16 }}>
                <a className="land-btn-ghost" href={plan.cta.href}>
                  {plan.cta.label}
                </a>
              </p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 56 }}>
          <h2 className="land-h2">What you get</h2>
          <ul className="land-trust-list" style={{ marginTop: 24 }}>
            <li>Connect WordPress, GitHub, ZIP, or live URL</li>
            <li>Deterministic issue scan → reviewable proposals</li>
            <li>Human approval before any write</li>
            <li>Deploy with live HTML verify and automatic rollback (WordPress)</li>
          </ul>
        </div>

        <div className="land-cta-row" style={{ marginTop: 40 }}>
          <a className="land-btn-primary" href="/signup">
            <span>Start free</span>
          </a>
          <a className="land-btn-ghost" href="/seo-aeo-geo">
            Learn SEO · AEO · GEO
          </a>
        </div>
      </section>
    </MarketingShell>
  );
}
