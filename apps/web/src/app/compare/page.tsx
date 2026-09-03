import type { Metadata } from "next";
import { MarketingShell } from "@/components/landing/MarketingShell";
import { BrandText } from "@/components/BrandText";
import { BRAND_NAME, getSiteUrl } from "@/lib/site";

const site = getSiteUrl();

export const metadata: Metadata = {
  title: `${BRAND_NAME} vs Ahrefs vs Yoast vs Alli AI`,
  description:
    "Compare growthOS to Ahrefs, Yoast/Rank Math, and Alli-style AI SEO tools. Research vs plugins vs a hosted approve → deploy → verify → rollback loop for SEO, AEO, and GEO.",
  alternates: { canonical: "/compare" },
  openGraph: {
    title: `${BRAND_NAME} vs SEO tools`,
    description:
      "Why teams buy growthOS: multi-connect scan + human approval + live HTML verify + rollback — not another report or unsupervised AI write.",
    url: `${site}/compare`,
    type: "article",
  },
};

const ROWS = [
  {
    capability: "Primary job",
    growthos: "Execute safe on-site fixes",
    ahrefs: "Research & rank tracking",
    yoast: "Manual on-page SEO in WP",
    alli: "AI changes / overlays",
  },
  {
    capability: "Human approval before write",
    growthos: "Required",
    ahrefs: "N/A (no writes)",
    yoast: "You edit manually",
    alli: "Varies",
  },
  {
    capability: "Live HTML verify after deploy",
    growthos: "Yes (WordPress)",
    ahrefs: "No",
    yoast: "No",
    alli: "Rare / limited",
  },
  {
    capability: "One-click rollback",
    growthos: "Yes (WordPress)",
    ahrefs: "No",
    yoast: "Revisions only",
    alli: "Varies",
  },
  {
    capability: "Works beyond WordPress",
    growthos: "GitHub PR · ZIP · Live URL",
    ahrefs: "Any site (read)",
    yoast: "WordPress only",
    alli: "Mostly platform-tied",
  },
  {
    capability: "SEO + AEO + GEO together",
    growthos: "Yes",
    ahrefs: "Mostly SEO",
    yoast: "Mostly SEO",
    alli: "Mostly SEO/content",
  },
  {
    capability: "Client-ready Mission Timeline",
    growthos: "Yes",
    ahrefs: "Reports",
    yoast: "No",
    alli: "Limited",
  },
] as const;

const BUY_REASONS = [
  {
    title: "You already have research tools",
    body: "Ahrefs/Semrush tell you what to fix. growthOS is the execution layer that ships title, meta, FAQ schema, and canonicals with approval.",
  },
  {
    title: "You fear unsupervised AI writes",
    body: "Customers don’t buy ‘more AI’. They buy confidence: approve → backup → verify live HTML → auto-rollback if verify fails.",
  },
  {
    title: "Your stack isn’t only WordPress",
    body: "Plugin-only tools stop at WP. growthOS also opens GitHub PRs, packs ZIP fixes, and guides Live URL applies.",
  },
] as const;

export default function ComparePage() {
  return (
    <MarketingShell path="/compare">
      <section className="land-section" style={{ paddingTop: 48 }}>
        <p className="land-kicker">Competitive wedge</p>
        <h1 className="land-h2">Not another SEO report. Not unsupervised AI.</h1>
        <p className="land-lead">
          <BrandText /> sits between research tools and risky auto-writers: scan
          SEO · AEO · GEO issues, propose diffs, get human approval, then deploy
          with verify &amp; rollback.
        </p>

        <div className="land-compare-wrap" style={{ marginTop: 40 }}>
          <table className="land-compare-table">
            <thead>
              <tr>
                <th scope="col">Capability</th>
                <th scope="col">growthOS</th>
                <th scope="col">Ahrefs / Semrush</th>
                <th scope="col">Yoast / Rank Math</th>
                <th scope="col">Alli-style AI SEO</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.capability}>
                  <th scope="row">{row.capability}</th>
                  <td data-strong="yes">{row.growthos}</td>
                  <td>{row.ahrefs}</td>
                  <td>{row.yoast}</td>
                  <td>{row.alli}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="land-section">
        <p className="land-kicker">When buyers choose us</p>
        <h2 className="land-h2">Three reasons teams pay</h2>
        <div className="land-audience" style={{ marginTop: 32 }}>
          {BUY_REASONS.map((r) => (
            <div key={r.title} className="land-audience-item">
              <strong>{r.title}</strong>
              <span>{r.body}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="land-section">
        <p className="land-kicker">What we will not claim</p>
        <h2 className="land-h2">Honest product boundaries</h2>
        <ul className="land-trust-list" style={{ marginTop: 24 }}>
          <li>We do not replace keyword research suites</li>
          <li>Beta change classes are intentionally narrow (title, meta, FAQ, canonical)</li>
          <li>Full verify/rollback today is strongest on WordPress + plugin</li>
          <li>Paid limits should match real usage — start free, upgrade when caps hurt</li>
        </ul>
        <div className="land-cta-row" style={{ marginTop: 40 }}>
          <a className="land-btn-primary" href="/signup">
            <span>Start free</span>
          </a>
          <a className="land-btn-ghost" href="/pricing">
            See plans
          </a>
        </div>
      </section>
    </MarketingShell>
  );
}
