"use client";

import { FormEvent, useEffect, useState } from "react";
import { joinWaitlist, trackEvent } from "@/lib/analytics";

const STEPS = [
  { title: "Connect", meta: "Any site" },
  { title: "Scan", meta: "Issues found" },
  { title: "Propose", meta: "AI diff" },
  { title: "Approve", meta: "You decide" },
  { title: "Deploy", meta: "Verify live", live: true },
  { title: "Rollback", meta: "If needed" },
];

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    trackEvent("visitor", { path: "/" });
  }, []);

  async function onWaitlist(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await joinWaitlist({ email, name, company, role: "beta" });
      setMsg(res.message);
      setEmail("");
      setName("");
      setCompany("");
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Could not join waitlist");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="land-page">
      <section className="land-hero" aria-label="Hero">
        <div className="land-top">
          <span
            style={{
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: "var(--land-ink)",
              fontSize: 15,
            }}
          >
            AI-Growth-OS
          </span>
          <nav style={{ display: "flex", gap: 20 }}>
            <a href="#how">Product</a>
            <a href="#trust">Trust</a>
            <a href="#beta">Beta</a>
            <a href="/login">Login</a>
          </nav>
        </div>

        <div className="land-hero-copy">
          <p className="land-brand">AI-Growth-OS</p>
          <h1 className="land-headline">
            Your website’s relentless growth engine
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
            ["Free", "1 site"],
            ["Starter", "$29 / month"],
            ["Pro", "$99 / month"],
            ["Agency", "$299 / month"],
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
        <form className="land-form" onSubmit={onWaitlist}>
          <input
            required
            type="email"
            placeholder="Work email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Work email"
          />
          <input
            placeholder="Name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Name"
          />
          <input
            placeholder="Company (optional)"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            aria-label="Company"
          />
          {err && (
            <p style={{ margin: 0, color: "var(--color-error)", fontSize: 13 }}>
              {err}
            </p>
          )}
          {msg && (
            <p style={{ margin: 0, color: "var(--color-success)", fontSize: 13 }}>
              {msg}
            </p>
          )}
          <button className="land-btn-primary" type="submit" disabled={busy}>
            {busy ? "Submitting…" : "Request beta access"}
          </button>
        </form>
      </section>

      <section className="land-section land-faq">
        <p className="land-kicker">FAQ</p>
        <h2 className="land-h2">Straight answers</h2>
        <div style={{ marginTop: 32 }}>
          <details>
            <summary>Is it safe to let AI write to my site?</summary>
            <p>
              You approve every change. We backup first, verify live HTML after
              apply, and roll back automatically if verification fails.
            </p>
          </details>
          <details>
            <summary>Do I need an OpenAI key?</summary>
            <p>
              No. Proposals work with deterministic rules. OpenAI only polishes
              meta copy when you add a key.
            </p>
          </details>
          <details>
            <summary>What can it deploy today?</summary>
            <p>
              Deploy / verify / rollback for meta title, meta description, FAQ
              schema, and canonical URLs. WordPress writes live via the plugin;
              GitHub opens a PR; ZIP packages a fix pack; Live URL exports an
              apply guide.
            </p>
          </details>
        </div>
      </section>

      <footer className="land-footer">
        <span>AI-Growth-OS</span>
        <span>Private beta · Multi-connect scan · Multi-mode deploy</span>
      </footer>
    </main>
  );
}
