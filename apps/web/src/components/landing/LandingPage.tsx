import Image from "next/image";
import { PLAN_LIMITS } from "@ai-growth-os/shared";
import { BRAND_NAME } from "@/lib/site";
import { submitBetaWaitlist } from "@/app/actions/waitlist";
import { BrandText } from "@/components/BrandText";
import { BrandMark } from "./BrandMark";
import { MarketingFooter } from "./MarketingFooter";
import { VisitorTracker } from "./VisitorTracker";

const PRODUCT_LOOP = [
  { title: "Connect", meta: "Any site" },
  { title: "Scan", meta: "Issues found" },
  { title: "Propose", meta: "AI diff" },
  { title: "Approve", meta: "You decide" },
  { title: "Deploy", meta: "Verify live", plain: true },
  { title: "Rollback", meta: "If needed" },
] as const;

const FIRST_RUN = [
  {
    n: "01",
    title: "Create a free account",
    body: "No card. Free plan: 2 sites · 20 scans.",
  },
  {
    n: "02",
    title: "Connect one site",
    body: "WordPress, GitHub, ZIP, or live URL.",
  },
  {
    n: "03",
    title: "Run a scan",
    body: "SEO · AEO · GEO gaps become before/after proposals.",
  },
  {
    n: "04",
    title: "Approve one safe fix",
    body: "We backup, write, verify live HTML, and roll back if verify fails.",
  },
] as const;

const PILOT_PROOF = [
  {
    who: "Agency · WordPress",
    outcome: "Client-ready audit trail",
    story:
      "Scan a client site, approve one meta fix, show Mission Timeline: backup → live write → HTML verify.",
    rail: ["Scan", "Approve", "Verify", "Done"],
    active: 2,
  },
  {
    who: "Founder · content site",
    outcome: "FAQ schema without a retainer",
    story:
      "Connect URL or ZIP, approve FAQ JSON-LD, ship the change — not another 40-page PDF.",
    rail: ["Connect", "Scan", "Approve", "Ship"],
    active: 3,
  },
  {
    who: "Team · GitHub / Next.js",
    outcome: "PR instead of blind write",
    story:
      "Same approve gate, different mode: open a PR so eng stays in the loop.",
    rail: ["Scan", "Approve", "PR open", "Merge"],
    active: 2,
  },
] as const;

const AUDIENCES = [
  {
    title: "Agencies",
    body: "Client SEO/AEO/GEO fixes with an audit trail — approve before write, verify after.",
  },
  {
    title: "Founders",
    body: "Ship title, meta, and FAQ schema without another SEO retainer for the basics.",
  },
  {
    title: "WordPress ops",
    body: "Live deploy with backup, HTML verification, and automatic rollback.",
  },
] as const;

const WEDGE = [
  [
    "vs Ahrefs / Semrush",
    "They research. We execute approved on-site fixes with an audit trail.",
  ],
  [
    "vs Yoast / Rank Math",
    "They help manual WP edits. We scan, propose, then write only after you approve.",
  ],
  [
    "vs Alli-style AI SEO",
    "We prioritize live HTML verify + rollback — and work beyond WordPress.",
  ],
] as const;

const HOME_PLANS = [
  { id: "free" as const, href: "/signup", cta: "Start free" },
  { id: "starter" as const, href: "/pricing", cta: "See Starter" },
  { id: "agency" as const, href: "/pricing", cta: "See Agency" },
] as const;

const FAQ_SCHEMA = [
  {
    q: `What is ${BRAND_NAME}?`,
    a: `${BRAND_NAME} is an AI-powered SEO, AEO and GEO growth engine. Connect a site, scan issues, approve safe fixes, and deploy with verification and rollback.`,
  },
  {
    q: "I'm new — what do I do first?",
    a: "Sign up free, create a workspace, connect one site (WordPress, GitHub, ZIP, or live URL), run a scan, then approve a single safe proposal. That is the full product loop.",
  },
  {
    q: "Is it safe to let AI write to my site?",
    a: "You approve every change. We backup first, verify live HTML after apply, and roll back automatically if verification fails.",
  },
  {
    q: "Will this replace Ahrefs / Semrush?",
    a: `No. Those tools research and report. ${BRAND_NAME} is the execution loop: scan → propose → approve → deploy → verify. Use research tools for keywords; use ${BRAND_NAME} to ship safe on-site changes.`,
  },
  {
    q: "Do I need an OpenAI key?",
    a: "No. Proposals work with deterministic rules. OpenAI only polishes meta copy when you add a key.",
  },
  {
    q: "What can it deploy today?",
    a: "Deploy / verify / rollback for meta title, meta description, FAQ schema, and canonical URLs. WordPress writes live via the plugin; GitHub opens a PR; ZIP packages a fix pack; Live URL exports an apply guide.",
  },
  {
    q: "What is SEO vs AEO vs GEO?",
    a: "SEO is classic search visibility. AEO helps answer engines surface clear Q&A. GEO (AI-visibility) improves how generative systems understand and cite your site — titles, schema, llms.txt, and structure all matter.",
  },
];

const FAQ_ITEMS = [
  {
    q: FAQ_SCHEMA[0].q,
    a: (
      <>
        <BrandText /> is an AI-powered SEO, AEO, and GEO growth engine. Connect a
        site, scan issues, approve safe fixes, and deploy with verify and rollback.
      </>
    ),
  },
  { q: FAQ_SCHEMA[1].q, a: FAQ_SCHEMA[1].a },
  { q: FAQ_SCHEMA[2].q, a: FAQ_SCHEMA[2].a },
  { q: FAQ_SCHEMA[3].q, a: FAQ_SCHEMA[3].a },
  { q: FAQ_SCHEMA[4].q, a: FAQ_SCHEMA[4].a },
  { q: FAQ_SCHEMA[5].q, a: FAQ_SCHEMA[5].a },
  { q: FAQ_SCHEMA[6].q, a: FAQ_SCHEMA[6].a },
];

export function LandingPage({
  betaNotice = null,
}: {
  betaNotice?: "ok" | "error" | null;
}) {
  return (
    <main className="land-page">
      <VisitorTracker path="/" />
      <header className="land-header">
        <div className="land-top">
          <BrandMark variant="header" />
          <nav className="land-nav">
            <a href="#start">Product</a>
            <a href="#demo">Demo</a>
            <a href="/pricing">Pricing</a>
            <a href="/compare">Compare</a>
            <a className="land-nav-login" href="/signup">
              Start free
            </a>
          </nav>
        </div>
      </header>

      <section className="land-hero" aria-label="Hero">
        <div className="land-hero-main">
          <div className="land-hero-copy">
            <BrandMark variant="hero" href={null} />
            <p className="land-eyebrow">
              {BRAND_NAME} — AI SEO, AEO &amp; GEO Growth Engine
            </p>
            <h1 className="land-headline">
              <span className="land-headline-lead">
                Your website&apos;s{" "}
                <span className="land-headline-accent">relentless</span>
              </span>{" "}
              <span className="land-headline-display">growth engine</span>
            </h1>
            <p className="land-support">
              Stop collecting SEO PDFs. <BrandText /> scans SEO · AEO · GEO issues,
              proposes safe fixes, and only writes after you approve — with verify
              &amp; rollback on WordPress.
            </p>
            <div className="land-cta-row">
              <a className="land-btn-primary" href="/signup">
                <span>Start free</span>
              </a>
              <a className="land-btn-ghost" href="#demo">
                Watch 60s demo
              </a>
            </div>
            <p className="land-hero-trust">
              No write without approval · Backup before deploy · Auto-rollback on
              failed verify
            </p>
          </div>
        </div>
      </section>

      <section className="land-stage" id="loop" aria-label="The product loop">
        <div className="land-stage-inner">
          <p className="land-stage-label">The product loop</p>
          <ol className="land-timeline">
            {PRODUCT_LOOP.map((step) => (
              <li key={step.title} className="land-step">
                <span
                  className={`land-step-dot${"plain" in step && step.plain ? " land-step-dot--plain" : ""}`}
                  aria-hidden
                />
                <p className="land-step-title">{step.title}</p>
                <p className="land-step-meta">{step.meta}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="start" className="land-section land-section--mist">
        <div className="land-editorial land-editorial--center">
          <div>
            <p className="land-kicker">How to start</p>
            <h2 className="land-h2">Your first 10 minutes</h2>
            <p className="land-lead">
              One path from signup to a verified change — connect, scan, approve,
              then verify live.
            </p>
          </div>
          <p className="land-text-cta land-text-cta--top">
            <a href="/signup">Create free account →</a>
          </p>
        </div>
        <div className="land-steps-row">
          {FIRST_RUN.map((s) => (
            <div key={s.n} className="land-steps-cell">
              <p className="land-steps-n">{s.n}</p>
              <strong>{s.title}</strong>
              <span>{s.body}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="land-section land-section--surface" id="demo">
        <p className="land-kicker">Product demo</p>
        <h2 className="land-h2">60 seconds: approve → verify → rollback</h2>
        <p className="land-lead">
          The trust loop buyers need before they pay — not another feature tour.
        </p>
        <div className="land-demo-frame">
          <p className="land-demo-meta">
            <span className="land-demo-brand">
              <span className="land-logo-mark land-logo-mark--tiny">
                <Image
                  src="/logo-mark.png"
                  alt={`${BRAND_NAME} logo`}
                  width={466}
                  height={338}
                />
              </span>
              {BRAND_NAME} product loop
            </span>
            <span>~60 sec · with sound off OK</span>
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
        <p className="land-text-cta">
          <a href="/signup">Start free and run this on your site →</a>
        </p>
      </section>

      <section id="trust" className="land-section land-section--mist">
        <div className="land-split land-split-wide">
          <div>
            <p className="land-kicker">Trust &amp; security</p>
            <h2 className="land-h2">Built like a transaction, not a chatbot</h2>
            <p className="land-lead">
              Teams do not fear AI ideas — they fear unsupervised writes.{" "}
              <BrandText /> treats every deploy as atomic, auditable, and reversible.
            </p>
          </div>
          <ul className="land-trust-list">
            <li>Human approval before every write</li>
            <li>Backup before WordPress deploy</li>
            <li>Live HTML verification — never assume success</li>
            <li>Automatic rollback when verification fails</li>
            <li>Mission Timeline audit trail for clients</li>
          </ul>
        </div>
      </section>

      <section id="proof" className="land-section land-section--surface">
        <p className="land-kicker">Pilot scenarios</p>
        <h2 className="land-h2">What running it looks like</h2>
        <p className="land-lead">
          Same loop, different connect modes. Mini timelines stand in for product
          UI — not stock logos.
        </p>
        <div className="land-proof" style={{ marginTop: 40 }}>
          {PILOT_PROOF.map((p) => (
            <article key={p.who} className="land-proof-item">
              <div className="land-proof-rail" aria-hidden>
                {p.rail.map((step, i) => (
                  <span
                    key={step}
                    className={`land-proof-chip${i === p.active ? " is-live" : i < p.active ? " is-done" : ""}`}
                  >
                    {step}
                  </span>
                ))}
              </div>
              <p className="land-proof-who">{p.who}</p>
              <h3 className="land-proof-outcome">{p.outcome}</h3>
              <p className="land-proof-story">{p.story}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="for" className="land-section land-section--mist">
        <p className="land-kicker">Who it&apos;s for</p>
        <h2 className="land-h2">Built for people who ship</h2>
        <p className="land-lead">
          If broken client sites or slow SEO vendors are the risk, this loop is for
          you.
        </p>
        <div className="land-audience" style={{ marginTop: 40 }}>
          {AUDIENCES.map((a) => (
            <div key={a.title} className="land-audience-item">
              <strong>{a.title}</strong>
              <span>{a.body}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="wedge" className="land-section land-section--surface">
        <div className="land-editorial land-editorial--stack">
          <p className="land-kicker">Why {BRAND_NAME}</p>
          <h2 className="land-h2 land-h2--wide">
            Research finds issues. Editors help you type. We ship approved fixes.
          </h2>
          <p className="land-lead land-lead--wide">
            <BrandText /> is the missing middle for SEO · AEO · GEO: approve →
            deploy → verify → rollback — across WordPress, GitHub, ZIP, and live URL.
          </p>
          <ul className="land-wedge-lines">
            {WEDGE.map(([t, d]) => (
              <li key={t}>
                <strong>{t}</strong>
                <span>{d}</span>
              </li>
            ))}
          </ul>
          <p className="land-text-cta">
            <a href="/compare">Full comparison table →</a>
          </p>
        </div>
      </section>

      <section id="pricing" className="land-section land-section--mist">
        <p className="land-kicker">Pricing</p>
        <h2 className="land-h2">Simple plans. Exact limits.</h2>
        <p className="land-lead">
          Meta title, meta description, FAQ schema, and canonicals in beta — narrow
          on purpose so the trust loop is proven first.
        </p>
        <div className="land-plan-grid" style={{ marginTop: 40 }}>
          {HOME_PLANS.map((plan) => {
            const limits = PLAN_LIMITS[plan.id];
            const featured = plan.id === "starter";
            return (
              <article
                key={plan.id}
                className={`land-plan${featured ? " is-featured" : ""}`}
              >
                {featured ? (
                  <p className="land-plan-badge">Most teams start here</p>
                ) : null}
                <h3 className="land-plan-name">{limits.label}</h3>
                <p className="land-plan-price">
                  <span>
                    {plan.id === "free"
                      ? "₹0"
                      : `₹${limits.priceInr.toLocaleString("en-IN")}`}
                  </span>
                  <small>{plan.id === "free" ? "private beta" : "/ month"}</small>
                </p>
                <ul className="land-plan-features">
                  <li>
                    <strong>{limits.sites} sites</strong>
                  </li>
                  <li>
                    <strong>
                      {limits.scansPerMonth.toLocaleString("en-IN")} scans / month
                    </strong>
                  </li>
                </ul>
                <a
                  className="land-btn-ghost"
                  href={plan.href}
                  style={{ marginTop: 8, placeContent: "center" }}
                >
                  {plan.cta}
                </a>
              </article>
            );
          })}
        </div>
        <p className="land-text-cta">
          <a href="/pricing">Compare plans in detail →</a>
        </p>
      </section>

      <section
        id="get-started"
        className="land-section land-convert land-section--ink"
        aria-label="Get started"
      >
        <p className="land-kicker">Next step</p>
        <h2 className="land-h2">Start free. Prove the loop.</h2>
        <p className="land-lead">
          Sign up → connect → scan → approve. Upgrade only when Free caps get in
          the way.
        </p>
        <div className="land-cta-row">
          <a className="land-btn-primary" href="/signup">
            <span>Start free</span>
          </a>
          <a className="land-btn-ghost" href="#demo">
            Watch the demo
          </a>
        </div>
        <p className="land-hero-trust">
          Free plan · No card · Approve before every write
        </p>
      </section>

      <section id="beta" className="land-section land-beta land-section--surface">
        <div className="land-beta-inner">
          <div className="land-beta-copy">
            <p className="land-kicker">Optional · guided beta</p>
            <h2 className="land-h2 land-beta-title">Prefer a walkthrough?</h2>
            <p className="land-lead land-beta-lead">
              Most people should <a href="/signup">start free</a>. Use the waitlist
              only if you want a guided call.
            </p>
          </div>
          <div className="land-beta-panel">
            <p className="land-form-heading">Request beta access</p>
            <form action={submitBetaWaitlist} className="land-form">
              <div className="land-form-field">
                <label htmlFor="waitlist-email">Work email</label>
                <input
                  id="waitlist-email"
                  name="email"
                  required
                  type="email"
                  placeholder="you@company.com"
                  autoComplete="email"
                />
              </div>
              <div className="land-form-field">
                <label htmlFor="waitlist-name">Name (optional)</label>
                <input
                  id="waitlist-name"
                  name="name"
                  placeholder="Your name"
                  autoComplete="name"
                />
              </div>
              <div className="land-form-field">
                <label htmlFor="waitlist-company">Company (optional)</label>
                <input
                  id="waitlist-company"
                  name="company"
                  placeholder="Company or agency"
                  autoComplete="organization"
                />
              </div>
              {betaNotice === "ok" ? (
                <p className="land-form-msg land-form-msg--success">
                  Thanks — you&apos;re on the beta list. We&apos;ll be in touch.
                </p>
              ) : null}
              {betaNotice === "error" ? (
                <p className="land-form-msg land-form-msg--error">
                  Could not join the waitlist. Please try again.
                </p>
              ) : null}
              <button className="land-btn-ghost land-form-submit" type="submit">
                Request beta access
              </button>
              <p className="land-form-footnote">
                Faster path: <a href="/signup">Create a free account</a>
              </p>
            </form>
          </div>
        </div>
      </section>

      <section className="land-section land-faq land-section--mist" id="faq">
        <p className="land-kicker">FAQ</p>
        <h2 className="land-h2">Straight answers</h2>
        <div style={{ marginTop: 32 }}>
          {FAQ_ITEMS.map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: FAQ_SCHEMA.map((item) => ({
                "@type": "Question",
                name: item.q,
                acceptedAnswer: { "@type": "Answer", text: item.a },
              })),
            }),
          }}
        />
      </section>

      <MarketingFooter />
    </main>
  );
}
