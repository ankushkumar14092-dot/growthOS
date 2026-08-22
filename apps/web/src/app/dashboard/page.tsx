"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import {
  apiBilling,
  apiBillingCheckout,
  apiBillingPortal,
  apiDeleteSite,
  apiDeploySite,
  apiMe,
  apiMissionControl,
  apiPilotMetrics,
  apiStartAudit,
  TOKEN_KEY,
  type BillingSummaryDto,
  type MeResponse,
  type MissionControlDto,
  type PilotMetricsDto,
} from "@/lib/api";

export default function MissionControlPage() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [mc, setMc] = useState<MissionControlDto | null>(null);
  const [billing, setBilling] = useState<BillingSummaryDto | null>(null);
  const [pilot, setPilot] = useState<PilotMetricsDto | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const orgId = me?.memberships[0]?.organization.id;

  const load = useCallback(async (token: string, organizationId: string) => {
    const [data, bill, metrics] = await Promise.all([
      apiMissionControl(token, organizationId),
      apiBilling(token, organizationId).catch(() => null),
      apiPilotMetrics(token, organizationId).catch(() => null),
    ]);
    setMc(data);
    setBilling(bill);
    setPilot(metrics);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      router.replace("/login");
      return;
    }
    apiMe(token)
      .then(async (data) => {
        if (data.memberships.length === 0) {
          router.replace("/onboarding");
          return;
        }
        setMe(data);
        await load(token, data.memberships[0].organization.id);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        router.replace("/login");
      });
  }, [router, load]);

  useEffect(() => {
    if (!orgId) return;
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    const active =
      (mc?.kpis.deploying ?? 0) > 0 ||
      mc?.sites.some((s) =>
        ["queued", "crawling", "auditing", "proposing", "deploying", "verifying"].includes(
          s.lastJobStatus ?? "",
        ),
      );
    if (!active) return;
    const t = setInterval(() => {
      load(token, orgId).catch(() => undefined);
    }, 3000);
    return () => clearInterval(t);
  }, [mc, orgId, load]);

  async function runScan(siteId?: string) {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token || !mc) return;
    const target =
      siteId ??
      mc.sites.find((s) => s.connected)?.id ??
      mc.sites[0]?.id;
    if (!target) {
      router.push("/sites/connect");
      return;
    }
    setBusy(`scan-${target}`);
    setError(null);
    try {
      const job = await apiStartAudit(token, target);
      router.push(`/job-runs/${job.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
      setBusy(null);
    }
  }

  async function deployApproved(siteId: string) {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    setBusy(`deploy-${siteId}`);
    setError(null);
    try {
      const res = await apiDeploySite(token, siteId);
      const first = res.deployments[0];
      if (first) router.push(`/deployments/${first.id}`);
      else if (orgId) await load(token, orgId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deploy failed");
    } finally {
      setBusy(null);
    }
  }

  async function removeWebsite(siteId: string, domain: string) {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token || !orgId) return;
    if (
      !window.confirm(
        `Remove ${domain}? Scans and proposals stay in history but the site leaves Mission Control.`,
      )
    ) {
      return;
    }
    setBusy(`remove-${siteId}`);
    setError(null);
    try {
      await apiDeleteSite(token, siteId);
      await load(token, orgId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Remove failed");
    } finally {
      setBusy(null);
    }
  }

  if (!me || !mc) {
    return (
      <div style={{ padding: 32, color: "var(--color-text-muted)" }}>
        Loading Mission Control…
      </div>
    );
  }

  const org = me.memberships[0]?.organization;
  const role = me.memberships[0]?.role;
  const userLabel = `${(me.profile as { name?: string })?.name ?? me.email} · ${role} · ${org?.plan}`;
  const delta = mc.kpis.healthDeltaWeek;

  return (
    <AppShell orgId={org?.id} orgName={org?.name} userLabel={userLabel}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          alignItems: "flex-start",
          marginBottom: 20,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>
            Mission Control
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--color-text-muted)" }}>
            What happened, what needs you, what to do next.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            style={secondaryBtn}
            onClick={() => router.push("/sites/connect")}
          >
            Connect Website
          </button>
          <button
            type="button"
            style={primaryBtn}
            disabled={Boolean(busy)}
            onClick={() => runScan()}
          >
            Run Scan
          </button>
        </div>
      </header>

      {error && (
        <p role="alert" style={{ color: "var(--color-error)", marginBottom: 12 }}>
          {error}
        </p>
      )}

      {/* KPIs */}
      <section
        className="mc-grid mc-kpis"
        aria-label="Key metrics"
        style={{ marginBottom: 20 }}
      >
        <Kpi
          label="Overall Health"
          value={`${mc.kpis.overallHealth}/100`}
          hint={
            delta === 0
              ? "this week"
              : delta > 0
                ? `↑ +${delta} this week`
                : `↓ ${delta} this week`
          }
          emphasize
        />
        <Kpi label="Active Websites" value={String(mc.kpis.activeWebsites)} />
        <Kpi
          label="Pending AI Proposals"
          value={String(mc.kpis.pendingProposals)}
          warn={mc.kpis.pendingProposals > 0}
        />
        <Kpi
          label="Deploying"
          value={String(mc.kpis.deploying)}
          pulse={mc.kpis.deploying > 0}
        />
        <Kpi
          label="Needs Approval"
          value={String(mc.kpis.needsApproval)}
          warn={mc.kpis.needsApproval > 0}
        />
        <Kpi
          label="Failed Deployments"
          value={String(mc.kpis.failedDeployments)}
          danger={mc.kpis.failedDeployments > 0}
        />
      </section>

      {/* Priority + notifications */}
      <section
        id="priority"
        className="mc-grid mc-main"
        style={{ marginBottom: 20 }}
      >
        <Panel title="Priority Tasks">
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
            {mc.priorityTasks.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => router.push(t.href)}
                  style={{
                    ...rowBtn,
                    borderLeft:
                      t.urgency === "high"
                        ? "3px solid var(--color-warning)"
                        : t.urgency === "medium"
                          ? "3px solid var(--color-info)"
                          : "3px solid var(--color-border)",
                  }}
                >
                  {t.label}
                </button>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Notifications">
          {mc.notifications.length === 0 ? (
            <p style={{ margin: 0, fontSize: 14, color: "var(--color-text-muted)" }}>
              No actionable alerts.
            </p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
              {mc.notifications.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => router.push(n.href)}
                    style={rowBtn}
                  >
                    <strong style={{ color: severityColor(n.severity) }}>
                      {n.title}
                    </strong>
                    <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                      {n.body}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </section>

      {/* Growth Pulse + Activity */}
      <section className="mc-grid mc-main" style={{ marginBottom: 20 }}>
        <Panel title="Growth Pulse" subtitle="This week">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))",
              gap: 12,
            }}
          >
            <PulseStat label="Meta improvements" value={`+${mc.growthPulse.metaImprovements}`} up />
            <PulseStat label="FAQ added" value={`+${mc.growthPulse.faqAdded}`} up />
            <PulseStat label="Issues resolved" value={`+${mc.growthPulse.issuesResolved}`} up />
            <PulseStat
              label="Deploy success"
              value={`${mc.growthPulse.deploymentSuccessRate}%`}
              up={mc.growthPulse.deploymentSuccessRate >= 90}
            />
            <PulseStat
              label="Rollbacks"
              value={String(mc.growthPulse.rollbacks)}
              up={mc.growthPulse.rollbacks === 0}
            />
          </div>
        </Panel>
        <Panel id="activity" title="Activity Timeline">
          {mc.activity.length === 0 ? (
            <p style={{ margin: 0, fontSize: 14, color: "var(--color-text-muted)" }}>
              No activity yet. Connect a site and run a scan.
            </p>
          ) : (
            <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {mc.activity.slice(0, 12).map((a) => (
                <li
                  key={a.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "56px 22px 1fr",
                    gap: 10,
                    padding: "10px 0",
                    borderBottom: "1px solid var(--color-border)",
                    alignItems: "start",
                  }}
                >
                  <time
                    style={{
                      fontSize: 12,
                      color: "var(--color-text-muted)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {formatTime(a.at)}
                  </time>
                  <span
                    aria-hidden
                    className={
                      a.kind === "deployment" &&
                      a.label.toLowerCase().includes("deploying")
                        ? "growth-pulse"
                        : undefined
                    }
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 11,
                      fontWeight: 700,
                      background: a.ok ? "var(--color-teal)" : "var(--color-error)",
                      color: "#fff",
                    }}
                  >
                    {a.ok ? "✓" : "!"}
                  </span>
                  <button
                    type="button"
                    onClick={() => router.push(a.href)}
                    style={{
                      border: "none",
                      background: "transparent",
                      padding: 0,
                      textAlign: "left",
                      cursor: "pointer",
                      color: "var(--color-text)",
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{a.label}</div>
                    <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                      {a.domain}
                    </div>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </section>

      {/* Website cards */}
      <section id="sites">
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 4px" }}>
          Websites
        </h2>
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--color-text-muted)" }}>
          Scores: SEO · AEO · GEO (AI-visibility = AEO + GEO)
        </p>
        {mc.sites.length === 0 ? (
          <Panel>
            <p style={{ margin: 0, fontWeight: 600 }}>No sites yet</p>
            <p style={{ margin: "8px 0 16px", fontSize: 14, color: "var(--color-text-muted)" }}>
              Connect a website to start the growth loop.
            </p>
            <button
              type="button"
              style={primaryBtn}
              onClick={() => router.push("/sites/connect")}
            >
              Connect website
            </button>
          </Panel>
        ) : (
          <div className="mc-grid mc-sites">
            {mc.sites.map((site) => (
              <article
                key={site.id}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)",
                  display: "grid",
                  gap: 12,
                }}
              >
                <button
                  type="button"
                  onClick={() => router.push(`/sites/${site.id}`)}
                  style={{
                    border: "none",
                    background: "transparent",
                    padding: 0,
                    textAlign: "left",
                    cursor: "pointer",
                    color: "var(--color-text)",
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{site.domain}</div>
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
                    {site.connectionType} · {site.connected ? "connected" : "not connected"}
                  </div>
                </button>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 8,
                    fontSize: 13,
                  }}
                >
                  <MiniMetric label="Health" value={site.health} />
                  <MiniMetric label="SEO" value={site.seo} />
                  <MiniMetric label="AEO" value={site.aeo} />
                  <MiniMetric label="GEO" value={site.geo} />
                </div>
                <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                  Pending {site.pending} · Deployments today {site.deploymentsToday}
                  <br />
                  Last scan{" "}
                  {site.lastScanAt ? relativeTime(site.lastScanAt) : "never"}
                  {site.lastJobStatus ? ` · ${site.lastJobStatus}` : ""}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    style={secondaryBtn}
                    disabled={Boolean(busy)}
                    onClick={() => runScan(site.id)}
                  >
                    {busy === `scan-${site.id}` ? "…" : "Run Scan"}
                  </button>
                  {site.pending > 0 && (
                    <button
                      type="button"
                      style={primaryBtn}
                      onClick={() => router.push(`/sites/${site.id}`)}
                    >
                      Review ({site.pending})
                    </button>
                  )}
                  {site.connected && (
                    <button
                      type="button"
                      style={secondaryBtn}
                      disabled={Boolean(busy)}
                      onClick={() => deployApproved(site.id)}
                    >
                      {busy === `deploy-${site.id}` ? "…" : "Deploy Approved"}
                    </button>
                  )}
                  <button
                    type="button"
                    style={dangerBtn}
                    disabled={Boolean(busy)}
                    onClick={() => removeWebsite(site.id, site.domain)}
                  >
                    {busy === `remove-${site.id}` ? "…" : "Remove Website"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section id="billing" style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 8px" }}>Billing</h2>
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--color-text-muted)" }}>
          Plan: <strong>{billing?.planLabel ?? org?.plan ?? "free"}</strong>
          {billing ? ` · ${billing.priceLabel}` : ""}
          {billing && !billing.razorpayConfigured ? " · stub mode (no Razorpay keys)" : ""}
        </p>
        {billing && (
          <div style={{ display: "grid", gap: 10, maxWidth: 560 }}>
            <p style={{ margin: 0, fontSize: 13 }}>
              Sites {billing.usage.sites}/{billing.limits.sites} · Scans (30d){" "}
              {billing.usage.scansThisPeriod}/{billing.limits.scansPerMonth}
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                style={primaryBtn}
                disabled={Boolean(busy)}
                onClick={async () => {
                  const token = localStorage.getItem(TOKEN_KEY);
                  if (!token || !orgId) return;
                  setBusy("checkout-starter");
                  try {
                    const res = await apiBillingCheckout(token, orgId, "starter");
                    window.location.href = res.url;
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Checkout failed");
                    setBusy(null);
                  }
                }}
              >
                {busy === "checkout-starter" ? "…" : "Upgrade Starter"}
              </button>
              <button
                type="button"
                style={secondaryBtn}
                disabled={Boolean(busy)}
                onClick={async () => {
                  const token = localStorage.getItem(TOKEN_KEY);
                  if (!token || !orgId) return;
                  setBusy("checkout-agency");
                  try {
                    const res = await apiBillingCheckout(token, orgId, "agency");
                    window.location.href = res.url;
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Checkout failed");
                    setBusy(null);
                  }
                }}
              >
                {busy === "checkout-agency" ? "…" : "Upgrade Agency"}
              </button>
              <button
                type="button"
                style={secondaryBtn}
                disabled={Boolean(busy)}
                onClick={async () => {
                  const token = localStorage.getItem(TOKEN_KEY);
                  if (!token || !orgId) return;
                  setBusy("portal");
                  try {
                    const res = await apiBillingPortal(token, orgId);
                    window.location.href = res.url;
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Manage billing failed");
                    setBusy(null);
                  }
                }}
              >
                {busy === "portal" ? "…" : "Cancel subscription"}
              </button>
            </div>
          </div>
        )}
      </section>

      {pilot && (
        <section style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 8px" }}>Pilot metrics</h2>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--color-text-muted)" }}>
            Scan completion {pilot.scans.completionRate}% · Approval {pilot.proposals.approvalRate}%
            (target {pilot.targets.approvalRate}%) · Deploy success {pilot.deployments.successRate}%
            (target {pilot.targets.deploySuccessRate}%) · WAU {pilot.wau}
          </p>
        </section>
      )}

      <span id="team" />
    </AppShell>
  );
}

function Kpi(props: {
  label: string;
  value: string;
  hint?: string;
  warn?: boolean;
  danger?: boolean;
  pulse?: boolean;
  emphasize?: boolean;
}) {
  return (
    <div
      className={props.pulse ? "growth-pulse" : undefined}
      style={{
        padding: 14,
        borderRadius: 12,
        border: "1px solid var(--color-border)",
        background: "var(--color-surface)",
      }}
    >
      <div style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 500 }}>
        {props.label}
      </div>
      <div
        style={{
          marginTop: 6,
          fontSize: props.emphasize ? 28 : 22,
          fontWeight: 700,
          letterSpacing: "-0.03em",
          color: props.danger
            ? "var(--color-error)"
            : props.warn
              ? "var(--color-warning)"
              : "var(--color-navy)",
        }}
      >
        {props.value}
      </div>
      {props.hint && (
        <div style={{ marginTop: 4, fontSize: 12, color: "var(--color-teal)" }}>
          {props.hint}
        </div>
      )}
    </div>
  );
}

function Panel(props: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section
      id={props.id}
      style={{
        padding: 16,
        borderRadius: 12,
        border: "1px solid var(--color-border)",
        background: "var(--color-surface)",
      }}
    >
      {props.title && (
        <div style={{ marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{props.title}</h2>
          {props.subtitle && (
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--color-text-muted)" }}>
              {props.subtitle}
            </p>
          )}
        </div>
      )}
      {props.children}
    </section>
  );
}

function PulseStat(props: { label: string; value: string; up?: boolean }) {
  return (
    <div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: props.up ? "var(--color-success)" : "var(--color-text)",
        }}
      >
        {props.value}
      </div>
      <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{props.label}</div>
    </div>
  );
}

function MiniMetric(props: { label: string; value: number }) {
  return (
    <div
      style={{
        padding: 8,
        borderRadius: 8,
        background: "var(--color-bg)",
        textAlign: "center",
      }}
    >
      <div style={{ fontWeight: 700 }}>{props.value}</div>
      <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{props.label}</div>
    </div>
  );
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function relativeTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function severityColor(s: string) {
  if (s === "error") return "var(--color-error)";
  if (s === "warning") return "var(--color-warning)";
  if (s === "success") return "var(--color-success)";
  return "var(--color-info)";
}

const primaryBtn: React.CSSProperties = {
  height: 40,
  padding: "0 16px",
  borderRadius: 8,
  border: "none",
  background: "var(--color-primary)",
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
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

const dangerBtn: React.CSSProperties = {
  height: 40,
  padding: "0 16px",
  borderRadius: 8,
  border: "1px solid #f0b4b4",
  background: "transparent",
  fontWeight: 500,
  cursor: "pointer",
  color: "var(--color-error)",
};

const rowBtn: React.CSSProperties = {
  width: "100%",
  textAlign: "left",
  display: "grid",
  gap: 4,
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid var(--color-border)",
  background: "var(--color-bg)",
  cursor: "pointer",
  color: "var(--color-text)",
};
