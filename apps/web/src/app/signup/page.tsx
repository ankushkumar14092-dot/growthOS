"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiSignup, TOKEN_KEY } from "@/lib/api";
import { trackEvent } from "@/lib/analytics";

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      const data = await apiSignup({
        name: String(fd.get("name") ?? ""),
        email: String(fd.get("email") ?? ""),
        password: String(fd.get("password") ?? ""),
      });
      localStorage.setItem(TOKEN_KEY, data.accessToken);
      trackEvent("signup", { email: data.user.email }, { userId: data.user.id });
      router.push("/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page" style={pageStyle}>
      <div style={wrapStyle}>
        <p style={brandStyle}>
          <a href="/" style={{ color: "inherit", textDecoration: "none" }}>
            AI-Growth-OS
          </a>
        </p>
        <form onSubmit={onSubmit} style={cardStyle}>
          <h1 style={titleStyle}>Create account</h1>
          <p style={mutedStyle}>
            Start a workspace to connect WordPress, GitHub, or a live URL. Scan
            for SEO · AEO · GEO gaps, approve AI proposals, then deploy with
            verify and rollback where supported.
          </p>
          <label style={labelStyle}>
            Name
            <input name="name" required style={inputStyle} />
          </label>
          <label style={labelStyle}>
            Email
            <input name="email" type="email" required style={inputStyle} />
          </label>
          <label style={labelStyle}>
            Password (min 8)
            <input
              name="password"
              type="password"
              minLength={8}
              required
              style={inputStyle}
            />
          </label>
          {error ? <p style={errorStyle}>{error}</p> : null}
          <button type="submit" disabled={loading} style={primaryBtn}>
            {loading ? "Creating…" : "Sign up"}
          </button>
          <p style={{ ...mutedStyle, marginTop: 16 }}>
            Already have an account? <a href="/login">Login</a>
            {" · "}
            <a href="/#trust">Trust model</a>
            {" · "}
            <a href="/">Home</a>
          </p>
        </form>
        <section className="auth-faq" style={faqBox} aria-label="FAQ">
          <h2 style={faqTitle}>FAQ</h2>
          <details>
            <summary>Is signup free?</summary>
            <p style={faqBody}>
              Yes — Free plan to start. Upgrade later via Razorpay for higher
              site and scan limits.
            </p>
          </details>
          <details>
            <summary>Does the Vercel app use AI?</summary>
            <p style={faqBody}>
              Optional LLM polish with an OpenAI key; scans and many proposals
              work without it.
            </p>
          </details>
        </section>
      </div>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  padding: 24,
  background: "var(--color-bg)",
};

const wrapStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 420,
  display: "flex",
  flexDirection: "column",
  gap: 16,
};

const brandStyle: React.CSSProperties = {
  margin: 0,
  fontWeight: 700,
  letterSpacing: "-0.03em",
  fontSize: 15,
  color: "var(--color-navy)",
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  padding: 24,
  borderRadius: 12,
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 24,
  fontWeight: 600,
  color: "var(--color-navy)",
};

const mutedStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 14,
  color: "var(--color-text-muted)",
  lineHeight: 1.5,
};

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontSize: 14,
  fontWeight: 500,
};

const inputStyle: React.CSSProperties = {
  height: 40,
  borderRadius: 8,
  border: "1px solid var(--color-border)",
  padding: "0 12px",
  fontSize: 16,
};

const primaryBtn: React.CSSProperties = {
  height: 44,
  borderRadius: 8,
  border: "none",
  background: "var(--color-primary)",
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
};

const errorStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--color-error)",
  fontSize: 14,
};

const faqBox: React.CSSProperties = {
  padding: 16,
  borderRadius: 12,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface)",
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const faqTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 14,
  fontWeight: 600,
  color: "var(--color-navy)",
};

const faqBody: React.CSSProperties = {
  margin: "6px 0 0",
  fontSize: 13,
  color: "var(--color-text-muted)",
  lineHeight: 1.45,
};
