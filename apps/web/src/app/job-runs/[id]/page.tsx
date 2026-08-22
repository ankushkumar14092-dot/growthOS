"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { trackEvent } from "@/lib/analytics";
import { apiGetJobRun, TOKEN_KEY, type JobRunDto } from "@/lib/api";

const STEPS = ["queued", "crawling", "auditing", "proposing", "awaiting_approval", "done"] as const;
const TERMINAL = new Set(["done", "failed", "awaiting_approval"]);

export default function JobRunPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<JobRunDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const trackedFinish = useRef(false);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      router.replace("/login");
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const data = await apiGetJobRun(token!, id);
        if (cancelled) return;
        setJob(data);
        if (TERMINAL.has(data.status) && !trackedFinish.current) {
          trackedFinish.current = true;
          trackEvent("scan_finished", {
            jobId: data.id,
            status: data.status,
            issues: data.issueCount ?? 0,
            proposals: data.proposalCount ?? 0,
          });
        }
        const willKeepPolling = !TERMINAL.has(data.status);
        if (willKeepPolling) {
          timer = setTimeout(poll, 1500);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load job");
        }
      }
    }
    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [id, router]);

  if (error) {
    return <main style={{ padding: 32 }}><p style={{ color: "#b42318" }}>{error}</p></main>;
  }
  if (!job) {
    return (
      <main style={{ padding: 32, color: "var(--color-text-muted)" }}>
        Loading scan…
      </main>
    );
  }

  const waitingApproval = job.status === "awaiting_approval";
  const doneEmpty =
    job.status === "done" && (job.proposalCount ?? 0) === 0;
  const activeIdx =
    job.status === "failed"
      ? STEPS.length
      : waitingApproval
        ? STEPS.indexOf("awaiting_approval")
        : Math.max(0, STEPS.indexOf(job.status as (typeof STEPS)[number]));

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: 32 }}>
      <div className="page-chrome">
        <button
          type="button"
          onClick={() => router.push(job.siteId ? `/sites/${job.siteId}` : "/dashboard")}
          style={linkBtn}
        >
          ← Back
        </button>
        <h1 style={{ margin: "12px 0 8px", fontSize: 24 }}>Scan status</h1>
        <p style={{ margin: 0, color: "var(--color-text-muted)", fontSize: 14 }}>
          {job.domain} · {job.connectionType} · {job.id.slice(0, 8)}…
        </p>
      </div>

      {waitingApproval && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 8,
            border: "1px solid var(--color-border)",
            background: "rgba(0,102,255,0.08)",
            fontSize: 14,
          }}
        >
          <strong>Scan finished — your turn.</strong>{" "}
          {(job.proposalCount ?? 0) > 0
            ? `${job.proposalCount} AI proposal(s) ready. Approve → Deploy is the next step (not stuck).`
            : "Open the site page to review findings."}
        </div>
      )}

      {doneEmpty && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 8,
            border: "1px solid var(--color-border)",
            background: "var(--color-surface)",
            fontSize: 14,
          }}
        >
          <strong>Scan finished with no auto-fix proposals.</strong>{" "}
          Issues found ({job.issueCount ?? 0}) may be manual/guide-only (e.g. speed, alt text).
          Open the site page for Top fixes.
        </div>
      )}

      <ol style={{ listStyle: "none", padding: 0, margin: "24px 0", display: "grid", gap: 10 }}>
        {STEPS.map((step, i) => {
          const failed = job.status === "failed" && i === activeIdx;
          const done =
            job.status === "done" ||
            (waitingApproval && i < activeIdx) ||
            (job.status !== "failed" && !waitingApproval && i < activeIdx);
          const running = job.status === step && !waitingApproval;
          const currentWait = waitingApproval && step === "awaiting_approval";
          return (
            <li
              key={step}
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid var(--color-border)",
                background: currentWait || running
                  ? "rgba(0,102,255,0.08)"
                  : "var(--color-surface)",
                fontWeight: currentWait || running ? 600 : 400,
                textTransform: "capitalize",
              }}
            >
              {done ? "✓ " : running || currentWait ? "● " : "○ "}
              {step === "awaiting_approval" ? "Awaiting your approval" : step}
              {failed ? " (failed earlier)" : ""}
              {currentWait ? " — your turn" : ""}
            </li>
          );
        })}
        {job.status === "failed" && (
          <li
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid #fecdca",
              background: "#fef3f2",
              color: "#b42318",
            }}
          >
            Failed{job.errorCode ? `: ${job.errorCode}` : ""}
            {job.errorMessage ? ` — ${job.errorMessage}` : ""}
          </li>
        )}
      </ol>

      <p style={{ fontSize: 14, color: "var(--color-text-muted)" }}>
        Pages: {job.pageCount ?? 0} · Issues: {job.issueCount ?? 0} · Proposals:{" "}
        {job.proposalCount ?? 0}
      </p>

      {(job.status === "done" ||
        job.status === "failed" ||
        job.status === "awaiting_approval") &&
        job.siteId && (
          <button
            type="button"
            style={primaryBtn}
            onClick={() => router.push(`/sites/${job.siteId}`)}
          >
            {waitingApproval ? "Review AI proposals →" : "View site issues"}
          </button>
        )}
    </main>
  );
}

const primaryBtn: React.CSSProperties = {
  marginTop: 16,
  height: 40,
  padding: "0 16px",
  borderRadius: 8,
  border: "none",
  background: "var(--color-primary)",
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
};

const linkBtn: React.CSSProperties = {
  border: "none",
  background: "transparent",
  cursor: "pointer",
  color: "var(--color-primary)",
  padding: 0,
  fontSize: 14,
};
