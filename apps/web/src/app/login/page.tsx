"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiLogin, apiMe, TOKEN_KEY } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      const data = await apiLogin({
        email: String(fd.get("email") ?? ""),
        password: String(fd.get("password") ?? ""),
      });
      localStorage.setItem(TOKEN_KEY, data.accessToken);
      const me = await apiMe(data.accessToken);
      if (me.memberships.length === 0) {
        router.push("/onboarding");
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={pageStyle}>
      <form onSubmit={onSubmit} style={cardStyle}>
        <h1 style={titleStyle}>Login</h1>
        <p style={mutedStyle}>Welcome back to AI-Growth-OS</p>
        <label style={labelStyle}>
          Email
          <input name="email" type="email" required style={inputStyle} />
        </label>
        <label style={labelStyle}>
          Password
          <input name="password" type="password" required style={inputStyle} />
        </label>
        {error ? <p style={errorStyle}>{error}</p> : null}
        <button type="submit" disabled={loading} style={primaryBtn}>
          {loading ? "Signing in…" : "Login"}
        </button>
        <p style={{ ...mutedStyle, marginTop: 16 }}>
          New here? <a href="/signup">Create account</a>
        </p>
      </form>
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

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 420,
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
