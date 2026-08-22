"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { TrustStrip } from "@/components/TrustStrip";
import { trackEvent } from "@/lib/analytics";
import {
  apiGetDeployment,
  apiMe,
  apiRollbackDeployment,
  TOKEN_KEY,
  type DeploymentDetailDto,
} from "@/lib/api";

export default function DeploymentTimelinePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [dep, setDep] = useState<
    (DeploymentDetailDto & {
      trust?: {
        verified: boolean;
        safe: boolean;
        rollbackAvailable: boolean;
        backupStored: boolean;
      };
      backup?: Record<string, unknown> | null;
      changeClass?: string;
    }) | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const trackedVerify = useRef(false);

  const load = useCallback(
    async (token: string) => {
      const d = await apiGetDeployment(token, id);
      setDep(d as typeof dep);
      if (
        !trackedVerify.current &&
        (d.status === "succeeded" || d.status === "failed")
      ) {
        trackedVerify.current = true;
        trackEvent("deployment_verified", {
          deploymentId: d.id,
          status: d.status,
          pass: d.verifyResult?.pass ?? d.status === "succeeded",
          proposalType: d.proposalType,
        });
      }
    },
    [id],
  );

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      router.replace("/login");
      return;
    }
    apiMe(token)
      .then(() => load(token))
      .catch(() => router.replace("/login"));
  }, [id, router, load]);

  useEffect(() => {
    if (!dep || !["ready", "deploying", "verifying"].includes(dep.status)) {
      return;
    }
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    const t = setInterval(() => {
      load(token).catch(() => undefined);
    }, 1500);
    return () => clearInterval(t);
  }, [dep, load]);

  async function onRollback() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token || !dep) return;
    setBusy(true);
    setError(null);
    try {
      const rb = await apiRollbackDeployment(token, dep.id);
      router.push(`/deployments/${rb.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rollback failed");
    } finally {
      setBusy(false);
    }
  }

  if (!dep) {
    return (
      <main style={{ maxWidth: 640, margin: "0 auto", padding: 32 }}>
        <p style={{ color: "var(--color-text-muted)" }}>Loading mission…</p>
      </main>
    );
  }

  const trust = dep.trust ?? {
    verified: dep.status === "succeeded",
    safe: dep.changeClass !== "blocked",
    rollbackAvailable: dep.action === "apply" && dep.status === "succeeded",
    backupStored: Boolean(dep.backup && Object.keys(dep.backup).length > 0),
  };

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: 32 }}>
      <div className="page-chrome">
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 8 }}>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            style={linkBtn}
          >
            ← Mission Control
          </button>
          <button
            type="button"
            onClick={() => router.push(`/sites/${dep.siteId}`)}
            style={linkBtn}
          >
            Site
          </button>
        </div>

        <header style={{ margin: "8px 0 0" }}>
          <h1 style={{ margin: 0, fontSize: 24 }}>Mission Timeline</h1>
          <p style={{ margin: "8px 0 0", color: "var(--color-text-muted)", fontSize: 14 }}>
            {dep.action === "rollback" ? "Rollback" : "Deploy"} ·{" "}
            {dep.proposalType?.replace(/_/g, " ") ?? "patch"} ·{" "}
            <strong style={{ color: statusColor(dep.status) }}>{dep.status}</strong>
            {dep.deployMode ? ` · ${dep.deployMode}` : ""}
          </p>
          {dep.prUrl && (
            <p style={{ margin: "8px 0 0", fontSize: 14 }}>
              <a href={dep.prUrl} target="_blank" rel="noreferrer">
                Open GitHub PR →
              </a>
            </p>
          )}
          {dep.verifyResult?.note && (
            <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--color-text-muted)" }}>
              {dep.verifyResult.note}
            </p>
          )}
          {Boolean(
            dep.backup &&
              typeof dep.backup === "object" &&
              (dep.backup as { pack?: { instructions?: string[] } }).pack?.instructions,
          ) && (
            <ul style={{ margin: "12px 0 0", paddingLeft: 18, fontSize: 13 }}>
              {(
                (dep.backup as { pack: { instructions: string[] } }).pack.instructions
              ).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
        </header>
      </div>

      <div style={{ marginBottom: 20 }}>
        <TrustStrip
          verified={trust.verified}
          safe={trust.safe}
          rollbackAvailable={trust.rollbackAvailable}
          backupStored={trust.backupStored}
        />
      </div>

      {dep.afterValue && (
        <section
          className="app-panel"
          style={{
            marginBottom: 24,
            padding: 14,
            borderRadius: 10,
            border: "1px solid var(--color-border)",
            background: "var(--color-surface)",
            fontSize: 13,
          }}
        >
          <strong style={{ display: "block", marginBottom: 8 }}>Before → after proof</strong>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
            <div style={{ color: "var(--color-text-muted)" }}>Before</div>
            <pre style={{ whiteSpace: "pre-wrap", margin: "4px 0 12px" }}>
              {dep.beforeValue || "(empty)"}
            </pre>
            <div style={{ color: "var(--color-text-muted)" }}>After (approved)</div>
            <pre style={{ whiteSpace: "pre-wrap", margin: "4px 0 0" }}>
              {dep.afterValue}
            </pre>
          </div>
          {dep.verifyResult?.checks && Array.isArray(dep.verifyResult.checks) && (
            <ul style={{ margin: "12px 0 0", paddingLeft: 18 }}>
              {(dep.verifyResult.checks as Array<{ name: string; pass: boolean; detail?: string }>).map(
                (c) => (
                  <li key={c.name} style={{ color: c.pass ? "var(--color-success)" : "var(--color-error)" }}>
                    {c.pass ? "✓" : "✗"} {c.name}
                    {c.detail ? ` — ${c.detail}` : ""}
                  </li>
                ),
              )}
            </ul>
          )}
        </section>
      )}

      {error && <p style={{ color: "var(--color-error)" }}>{error}</p>}

      <ol
        style={{
          listStyle: "none",
          padding: 0,
          margin: "0 0 28px",
          display: "grid",
          gap: 0,
        }}
      >
        {(dep.timeline ?? []).map((step, i) => {
          const running =
            ["deploying", "verifying"].includes(dep.status) &&
            i === (dep.timeline?.length ?? 1) - 1;
          return (
            <li
              key={`${step.event}-${i}`}
              style={{
                display: "grid",
                gridTemplateColumns: "72px 28px 1fr",
                gap: 12,
                alignItems: "start",
                padding: "12px 0",
                borderBottom: "1px solid var(--color-border)",
              }}
            >
              <time
                style={{
                  fontSize: 12,
                  color: "var(--color-text-muted)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {formatTime(step.at)}
              </time>
              <span
                aria-hidden
                className={running ? "growth-pulse" : undefined}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  background: step.ok ? "var(--color-teal)" : "var(--color-error)",
                  color: "#fff",
                }}
              >
                {step.ok ? "✓" : "!"}
              </span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{step.label}</div>
              </div>
            </li>
          );
        })}
      </ol>

      {dep.status === "succeeded" && dep.action === "apply" && (
        <button
          type="button"
          style={secondaryBtn}
          disabled={busy}
          onClick={onRollback}
        >
          {busy ? "Queuing…" : "Rollback this change"}
        </button>
      )}

      {dep.errorMessage && (
        <p style={{ marginTop: 16, fontSize: 13, color: "var(--color-error)" }}>
          {dep.errorMessage}
        </p>
      )}
    </main>
  );
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function statusColor(status: string) {
  if (status === "succeeded") return "var(--color-success)";
  if (status === "failed" || status === "rolled_back") return "var(--color-error)";
  return "var(--color-primary)";
}

const linkBtn: React.CSSProperties = {
  border: "none",
  background: "transparent",
  cursor: "pointer",
  color: "var(--color-primary)",
  padding: 0,
  fontSize: 14,
};

const secondaryBtn: React.CSSProperties = {
  height: 40,
  padding: "0 16px",
  borderRadius: 8,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface)",
  fontWeight: 500,
  cursor: "pointer",
  color: "var(--color-text)",
};
