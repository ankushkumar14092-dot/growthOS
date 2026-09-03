import { BRAND_NAME } from "@/lib/site";
import { submitBetaWaitlist } from "@/app/actions/waitlist";
import { BrandText } from "@/components/BrandText";
import { BrandMark } from "./BrandMark";
import { VisitorTracker } from "./VisitorTracker";

const STEPS = [
  { title: "Connect", meta: "Any site" },
  { title: "Scan", meta: "Issues found" },
  { title: "Propose", meta: "AI diff" },
  { title: "Approve", meta: "You decide" },
  { title: "Deploy", meta: "Verify live", live: true },
  { title: "Rollback", meta: "If needed" },
];

const AUDIENCES = [
  {
    title: "Agencies",
    body: "Run client SEO/AEO/GEO fixes with an audit trail you can show — approve before write, verify after.",
  },
  {
    title: "Founders",
    body: "Ship title, meta, and FAQ schema without hiring another SEO retainer for the basics.",
  },
  {
    title: "WordPress ops",
    body: "Live deploy with backup, HTML verification, and automatic rollback if something looks wrong.",
  },
] as const;

const FAQ_SCHEMA = [
  {
    q: `What is ${BRAND_NAME}?`,
    a: `${BRAND_NAME} is an AI-powered SEO, AEO, and GEO growth engine. Connect a site, scan issues, approve safe fixes, and deploy with verify and rollback.`,
  },
  {
    q: "Is it safe to let AI write to my site?",
    a: "You approve every change. We backup first, verify live HTML after apply, and roll back automatically if verification fails.",
  },
  {
    q: "Will this replace Ahrefs / Semrush?",
    a: "No. Those tools research and report. growthOS is the execution loop: scan → propose → approve → deploy → verify. Use research tools for keywords; use growthOS to ship safe on-site changes.",
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
            <a href="#how">Product</a>
            <a href="/pricing">Pricing</a>
            <a href="/compare">Compare</a>
            <a href="/seo-aeo-geo">SEO · AEO · GEO</a>
            <a href="#beta">Beta</a>
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
            <h1 className="land-headline">
              <span className="land-headline-lead">
                Your website&apos;s{" "}
                <span className="land-headline-accent">relentless</span>
              </span>
              <br />
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
              <a className="land-btn-ghost" href="#how">
                See how it works
              </a>
            </div>
            <p className="land-hero-trust">
              No write without approval · Backup before deploy · Auto-rollback on
              failed verify
            </p>
          </div>
        </div>

        <div className="land-stage" aria-hidden={false}>
          <div className="land-stage-inner">
            <p className="land-stage-label">Mission Timeline</p>
            <div className="land-timeline" role="list">
              {STEPS.map((s) => (
                <div
                  key={s.title}
                  className={`land-step${s.live ? " is-live" : ""}`}
                  role="listitem"
                >
                  <span className="land-step-dot" aria-hidden />
                  <p className="land-step-title">{s.title}</p>
                  <p className="land-step-meta">{s.meta}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="for" className="land-section">
        <p className="land-kicker">Who it&apos;s for</p>
        <h2 className="land-h2">Built for people who ship, not slide decks</h2>
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

      <section id="how" className="land-section">
        <p className="land-kicker">How it works</p>
        <h2 className="land-h2">From connect to verified change</h2>
        <p className="land-lead">
          One operational loop agencies can trust — not another audit PDF.
        </p>
        <div className="land-flow" style={{ marginTop: 40 }}>
          {[
            [
              "01",
              "Connect",
              "WordPress, GitHub, ZIP upload, or live URL — pick how you connect.",
            ],
            [
              "02",
              "Scan",
              "Crawl capped pages. Deterministic issues become proposals.",
            ],
            [
              "03",
              "Approve",
              "Review before/after. Nothing writes until you say so.",
            ],
            [
              "04",
              "Deploy & verify",
              "WP live write, GitHub PR, ZIP fix pack, or Live URL apply guide — with verify/rollback per mode.",
            ],
          ].map(([n, t, d]) => (
            <div key={n} className="land-flow-item">
              <div className="land-flow-num">{n}</div>
              <div>
                <strong>{t}</strong>
                <span>{d}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="wedge" className="land-section">
        <p className="land-kicker">Why buy growthOS</p>
        <h2 className="land-h2">What&apos;s new vs tools you already know</h2>
        <p className="land-lead">
          Ahrefs finds issues. Yoast helps you edit WordPress. Many AI SEO tools
          write too freely. <BrandText /> is the missing middle: approve → deploy →
          verify → rollback across SEO · AEO · GEO.
        </p>
        <div className="land-flow" style={{ marginTop: 40 }}>
          {[
            [
              "01",
              "vs Ahrefs / Semrush",
              "They research. We execute approved on-site fixes with an audit trail.",
            ],
            [
              "02",
              "vs Yoast / Rank Math",
              "They help manual edits inside WP. We scan and propose, then write only after you approve.",
            ],
            [
              "03",
              "vs Alli-style AI SEO",
              "We prioritize live HTML verification + rollback and work beyond WordPress (GitHub / ZIP / Live URL).",
            ],
            [
              "04",
              "Our wedge",
              "Hosted Mission Control + multi-connect + trust loop you can show a client.",
            ],
          ].map(([n, t, d]) => (
            <div key={n} className="land-flow-item">
              <div className="land-flow-num">{n}</div>
              <div>
                <strong>{t}</strong>
                <span>{d}</span>
              </div>
            </div>
          ))}
        </div>
        <p style={{ marginTop: 20 }}>
          <a href="/compare">Full comparison table →</a>
        </p>
      </section>

      <section id="trust" className="land-section">
        <div className="land-split land-split-wide">
          <div>
            <p className="land-kicker">Why teams trust it</p>
            <h2 className="land-h2">AI that can&apos;t silently break a client site</h2>
            <p className="land-lead">
              Customers don&apos;t fear AI ideas — they fear unsupervised writes.
              <BrandText /> is built like a financial transaction: atomic,
              auditable, reversible, verified.
            </p>
          </div>
          <ul className="land-trust-list">
            <li>Human approval before every write</li>
            <li>Backup stored before deploy</li>
            <li>Live HTML verification — never assume success</li>
            <li>Automatic rollback when verification fails</li>
            <li>Mission Timeline you can show a client</li>
          </ul>
        </div>
      </section>

      <section className="land-section">
        <p className="land-kicker">Beta scope</p>
        <h2 className="land-h2">Start with three high-ROI changes</h2>
        <p className="land-lead">
          Meta title, meta description, and FAQ schema — plus canonicals. Narrow on
          purpose so the trust loop is proven before we expand change types.
        </p>
      </section>

      <section className="land-section">
        <p className="land-kicker">Pricing</p>
        <h2 className="land-h2">Simple plans. Start free.</h2>
        <p className="land-lead">
          Free for private beta. Upgrade when site and scan limits need to grow.
        </p>
        <div className="land-price-row">
          {[
            ["Free", "₹0 · 2 sites"],
            ["Starter", "₹3,999 / month"],
            ["Agency", "₹15,999 / month"],
          ].map(([plan, price]) => (
            <div key={plan} className="land-price-item">
              <strong>{plan}</strong>
              <span>{price}</span>
            </div>
          ))}
        </div>
        <p style={{ marginTop: 20 }}>
          <a href="/pricing">Compare plans →</a>
        </p>
      </section>

      <section id="beta" className="land-section land-beta">
        <div className="land-beta-inner">
          <div className="land-beta-copy">
            <p className="land-kicker">Private beta</p>
            <h2 className="land-h2 land-beta-title">Want early access + feedback calls?</h2>
            <p className="land-lead land-beta-lead">
              Prefer the waitlist if you want guided onboarding. Or create an account
              now and run the loop yourself — especially WordPress deploy → verify →
              rollback.
            </p>
            <ol className="land-next-steps">
              <li>We review your request within a few days</li>
              <li>You connect a site and run a scan</li>
              <li>You approve a safe change and see verify/rollback</li>
            </ol>
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
              <button className="land-btn-primary land-form-submit" type="submit">
                <span>Request beta access</span>
              </button>
              <p className="land-form-footnote">
                Already ready? <a href="/signup">Create a free account</a>
              </p>
            </form>
          </div>
        </div>
      </section>

      <section className="land-section land-faq" id="faq">
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

      <footer className="land-footer">
        <BrandMark variant="header" />
        <nav style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <a href="/#how">Product</a>
          <a href="/pricing">Pricing</a>
          <a href="/compare">Compare</a>
          <a href="/seo-aeo-geo">SEO · AEO · GEO</a>
          <a href="/#faq">FAQ</a>
          <a href="/signup">Signup</a>
          <a href="/login">Login</a>
          <a href="/llms.txt">llms.txt</a>
        </nav>
        <span className="land-footer-note">
          <BrandText /> private beta · Approve before write · Verify after deploy
        </span>
      </footer>
    </main>
  );
}
