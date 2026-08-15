"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiCreateOrg, apiMe, TOKEN_KEY } from "@/lib/api";

export default function OnboardingPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      router.replace("/login");
      return;
    }
    apiMe(token)
      .then((me) => {
        if (me.memberships.length > 0) {
          router.replace("/dashboard");
        } else {
          setReady(true);
        }
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      await apiCreateOrg(token, {
        name: String(fd.get("name") ?? ""),
        plan: String(fd.get("plan") ?? "free"),
      });
      router.push("/sites/connect?first=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create workspace");
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return (
      <main style={pageStyle}>
        <p style={{ color: "var(--color-text-muted)" }}>Loading…</p>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <form onSubmit={onSubmit} style={cardStyle}>
        <h1 style={titleStyle}>Create workspace</h1>
        <p style={mutedStyle}>
          Step 1 of 2 — then connect a website. Target: first scan in under 5
          minutes.
        </p>
        <label style={labelStyle}>
          Workspace name
          <input
            name="name"
            required
            placeholder="Acme Agency"
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Plan
          <select name="plan" defaultValue="free" style={inputStyle}>
            <option value="free">Free</option>
            <option value="starter">Starter</option>
            <option value="agency">Agency</option>
          </select>
        </label>
        {error ? <p style={errorStyle}>{error}</p> : null}
        <button type="submit" disabled={loading} style={primaryBtn}>
          {loading ? "Creating…" : "Continue"}
        </button>
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
  background: "#fff",
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
