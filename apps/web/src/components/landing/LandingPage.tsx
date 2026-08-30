import { BRAND_NAME, PRODUCT_NAME, SITE_DISPLAY } from "@/lib/site";
import { VisitorTracker } from "./VisitorTracker";
import { WaitlistForm } from "./WaitlistForm";

const STEPS = [
  { title: "Connect", meta: "Any site" },
  { title: "Scan", meta: "Issues found" },
  { title: "Propose", meta: "AI diff" },
  { title: "Approve", meta: "You decide" },
  { title: "Deploy", meta: "Verify live", live: true },
  { title: "Rollback", meta: "If needed" },
];

const FAQ_ITEMS = [
  {
    q: "What is grothos?",
    a: "grothos (AI-Growth-OS) is an AI-powered SEO, AEO, and GEO growth engine. Connect a site, scan issues, approve safe fixes, and deploy with verify and rollback.",
  },
  {
    q: "Is it safe to let AI write to my site?",
    a: "You approve every change. We backup first, verify live HTML after apply, and roll back automatically if verification fails.",
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

export function LandingPage() {
  return (
    <main className="land-page">
      <VisitorTracker path="/" />
      <header className="land-header">
        <div className="land-top">
          <a
            href="/"
            style={{
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: "var(--land-ink)",
              fontSize: 15,
              textDecoration: "none",
            }}
          >
            {BRAND_NAME}
          </a>
          <nav style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <a href="#how">Product</a>
            <a href="#trust">Trust</a>
            <a href="#beta">Beta</a>
            <a className="land-nav-login" href="/login">
              Login
            </a>
          </nav>
        </div>
      </header>

      <section className="land-hero" aria-label="Hero">
        <div className="land-hero-copy">
          <p className="land-brand">{SITE_DISPLAY}</p>
          <h1 className="land-headline">
            {BRAND_NAME} — your website&apos;s relentless growth engine
          </h1>
          <p className="land-support">
            SEO · AEO · GEO (AI-visibility) — connect any site, scan, approve.
            On WordPress: deploy, verify, and rollback safely.
          </p>
          <div className="land-cta-row">
            <a className="land-btn-primary" href="#beta">
              Join Private Beta
            </a>
            <a className="land-btn-ghost" href="/signup">
              Create account
            </a>
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

      <section id="trust" className="land-section">
        <div className="land-split land-split-wide">
          <div>
            <p className="land-kicker">Trust</p>
            <h2 className="land-h2">Built like a financial transaction</h2>
            <p className="land-lead">
              Atomic. Auditable. Reversible. Verified. That is the product.
            </p>
          </div>
          <ul className="land-trust-list">
            <li>Backup stored before every write</li>
            <li>Live HTML verification — never assume success</li>
            <li>Automatic rollback when verification fails</li>
            <li>Mission Timeline you can show a client</li>
          </ul>
        </div>
      </section>

      <section className="land-section">
        <p className="land-kicker">Beta scope</p>
        <h2 className="land-h2">Three safe, high-ROI changes</h2>
        <p className="land-lead">
          Meta title, meta description, and FAQ schema. Expand only after real
          usage proves the loop.
        </p>
      </section>

      <section className="land-section">
        <p className="land-kicker">Pricing</p>
        <h2 className="land-h2">Simple plans. Beta is free.</h2>
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
      </section>

      <section id="beta" className="land-section land-beta">
        <p className="land-kicker">Private beta</p>
        <h2 className="land-h2">Try the real trust loop</h2>
        <p className="land-lead">
          For teams who will try the full loop — especially WordPress deploy →
          verify → rollback — and give blunt feedback. Scan-only users on URL /
          ZIP / GitHub are welcome too.
        </p>
        <WaitlistForm />
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
              mainEntity: FAQ_ITEMS.map((item) => ({
                "@type": "Question",
                name: item.q,
                acceptedAnswer: { "@type": "Answer", text: item.a },
              })),
            }),
          }}
        />
      </section>

      <footer className="land-footer">
        <span>{SITE_DISPLAY}</span>
        <nav style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <a href="/#how">Product</a>
          <a href="/#faq">FAQ</a>
          <a href="/signup">Signup</a>
          <a href="/login">Login</a>
          <a href="/llms.txt">llms.txt</a>
          <a href="/sitemap.xml">Sitemap</a>
        </nav>
        <span>
          {PRODUCT_NAME} private beta · Multi-connect scan · Multi-mode deploy
        </span>
      </footer>
    </main>
  );
}
