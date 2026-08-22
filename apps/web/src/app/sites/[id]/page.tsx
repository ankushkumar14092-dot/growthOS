"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getIssueOwnerGuide, scoreGrowthPillars } from "@ai-growth-os/shared";
import { trackEvent } from "@/lib/analytics";
import {
  apiApplySiteResearch,
  apiApproveProposal,
  apiDeleteSite,
  apiDeploySite,
  apiGetSite,
  apiGetSiteResearch,
  apiListDeployments,
  apiListIssues,
  apiListJobRuns,
  apiListProposals,
  apiMe,
  apiPatchSiteSettings,
  apiRejectProposal,
  apiRunSiteResearch,
  apiStartAudit,
  TOKEN_KEY,
  type ConnectionType,
  type DeploymentDto,
  type IssueDto,
  type JobRunDto,
  type ProposalDto,
  type SiteDto,
  type SiteResearchDto,
} from "@/lib/api";

function deployHelp(type: ConnectionType | undefined): string {
  switch (type) {
    case "github":
      return "Approve → Deploy opens a GitHub PR with real files (public/llms.txt, robots, sitemap, head/metadata helpers). Merge + host redeploy to show on the live page. Close PR to roll back unmerged deploys.";
    case "zip":
      return "Approve creates a draft patch. Deploy packages a fix pack you apply in your project (no live host write).";
    case "url_audit":
      return "Live URL can scan and propose, but cannot write your host (Vercel/etc.). Deploy only exports an apply guide. For real-page updates use WordPress plugin or GitHub connect.";
    case "wordpress":
    default:
      return "Approve → Deploy writes to WordPress (title, meta, canonical, OG, FAQ, llms.txt, robots, sitemap), verifies live HTML, and rolls back on failure.";
  }
}

function connectionStatusLabel(site: SiteDto): string {
  const typeLabel =
    site.connectionType === "url_audit"
      ? "Live URL"
      : site.connectionType === "wordpress"
        ? "WordPress"
        : site.connectionType === "github"
          ? "GitHub"
          : site.connectionType === "zip"
            ? "ZIP"
            : site.connectionType;
  if (site.connectionType === "url_audit") {
    return `${typeLabel} · ${site.connected ? "reachable" : "unreachable"}`;
  }
  return `${typeLabel} · ${site.connected ? "connected" : "not connected"}`;
}

export default function SiteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [site, setSite] = useState<SiteDto | null>(null);
  const [jobs, setJobs] = useState<JobRunDto[]>([]);
  const [issues, setIssues] = useState<IssueDto[]>([]);
  const [proposals, setProposals] = useState<ProposalDto[]>([]);
  const [deployments, setDeployments] = useState<DeploymentDto[]>([]);
  const [research, setResearch] = useState<SiteResearchDto | null>(null);
  const [researchConfigured, setResearchConfigured] = useState<{
    tavily: boolean;
    serp: boolean;
  } | null>(null);
  const [researchQuery, setResearchQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (token: string) => {
      const [s, j, iss, props, deps, researchPack] = await Promise.all([
        apiGetSite(token, id),
        apiListJobRuns(token, id),
        apiListIssues(token, id),
        apiListProposals(token, id),
        apiListDeployments(token, id).catch(() => [] as DeploymentDto[]),
        apiGetSiteResearch(token, id).catch(() => null),
      ]);
      setSite(s);
      setJobs(j);
      setIssues(iss);
      setProposals(props);
      setDeployments(deps);
      if (researchPack) {
        setResearchConfigured(researchPack.configured);
        setResearch(researchPack.research);
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
    const latest = jobs[0];
    const activeDeploy = deployments.some((d) =>
      ["ready", "deploying", "verifying"].includes(d.status),
    );
    const jobBusy =
      latest &&
      ["queued", "crawling", "auditing", "proposing", "deploying", "verifying"].includes(
        latest.status,
      );
    if (!jobBusy && !activeDeploy) return;
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    const t = setInterval(() => {
      load(token).catch(() => undefined);
    }, 2000);
    return () => clearInterval(t);
  }, [jobs, deployments, load]);

  const topFixes = useMemo(() => {
    const byType = new Map<string, IssueDto[]>();
    for (const iss of issues) {
      const list = byType.get(iss.issueType) ?? [];
      list.push(iss);
      byType.set(iss.issueType, list);
    }
    return [...byType.entries()]
      .map(([issueType, rows]) => {
        const guide = getIssueOwnerGuide(issueType);
        return {
          issueType,
          count: rows.length,
          guide,
        };
      })
      .sort((a, b) => a.guide.priority - b.guide.priority || b.count - a.count)
      .slice(0, 6);
  }, [issues]);

  const pillars = useMemo(
    () =>
      scoreGrowthPillars(
        issues.map((i) => i.issueType),
        { connected: site?.connected ?? false },
      ),
    [issues, site?.connected],
  );

  const pending = proposals
    .filter((p) => p.status === "pending_review")
    .sort((a, b) => b.confidence - a.confidence);
  const highlightedIds = new Set(pending.slice(0, 3).map((p) => p.id));
  const orderedProposals = [
    ...pending,
    ...proposals.filter((p) => p.status !== "pending_review"),
  ];
  const deployable = proposals.filter(
    (p) => p.status === "approved" && p.patchId && p.changeClass !== "blocked",
  );
  const needsWpConnect =
    site?.connectionType === "wordpress" && site.connected === false;
  const isLiveUrlOnly = site?.connectionType === "url_audit";

  async function runScan() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const job = await apiStartAudit(token, id);
      router.push(`/job-runs/${job.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed to start");
    } finally {
      setBusy(false);
    }
  }

  async function onApprove(proposalId: string) {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    setActionId(proposalId);
    try {
      await apiApproveProposal(token, proposalId);
      trackEvent("proposal_approved", { proposalId, siteId: id });
      await load(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approve failed");
    } finally {
      setActionId(null);
    }
  }

  async function onReject(proposalId: string) {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    setActionId(proposalId);
    try {
      await apiRejectProposal(token, proposalId);
      await load(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reject failed");
    } finally {
      setActionId(null);
    }
  }

  async function onDeploy(patchId?: string) {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiDeploySite(
        token,
        id,
        patchId ? { patchIds: [patchId] } : {},
      );
      trackEvent("deployment_started", {
        siteId: id,
        count: res.deployments.length,
      });
      const first = res.deployments[0];
      if (first) router.push(`/deployments/${first.id}`);
      else await load(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deploy failed");
    } finally {
      setBusy(false);
    }
  }

  async function onRemoveWebsite() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token || !site) return;
    if (
      !window.confirm(
        `Remove ${site.domain}? It will leave Mission Control (history is kept).`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiDeleteSite(token, id);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Remove failed");
      setBusy(false);
    }
  }

  async function onRunResearch() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    setActionId("research");
    setError(null);
    try {
      const result = await apiRunSiteResearch(
        token,
        id,
        researchQuery.trim() || undefined,
      );
      setResearch(result);
      setResearchConfigured(result.configured);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Research failed");
    } finally {
      setActionId(null);
    }
  }

  async function onApplyResearch() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    if (!research) {
      setError("Run research first");
      return;
    }
    setActionId("research-apply");
    setError(null);
    try {
      const result = await apiApplySiteResearch(token, id, { approve: true });
      await load(token);
      const note = result.note ? ` ${result.note}` : "";
      window.alert(
        `Created ${result.created.length} proposals, approved ${result.approved.length}. ${result.next}${note}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Apply research failed");
    } finally {
      setActionId(null);
    }
  }

  return (
    <main style={{ maxWidth: 880, margin: "0 auto", padding: 32 }}>
      <div className="page-chrome">
        <button type="button" onClick={() => router.push("/dashboard")} style={linkBtn}>
          ← Mission Control
        </button>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            margin: "12px 0 0",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 24 }}>Site scan</h1>
            {site && (
              <p style={{ margin: "6px 0 0", color: "var(--color-text-muted)", fontSize: 14 }}>
                {site.domain} · {connectionStatusLabel(site)}
              </p>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" style={primaryBtn} disabled={busy} onClick={runScan}>
              {busy ? "Starting…" : "Run scan"}
            </button>
            <button
              type="button"
              style={dangerBtn}
              disabled={busy}
              onClick={onRemoveWebsite}
            >
              Remove Website
            </button>
          </div>
        </header>
      </div>
      {error && <p style={{ color: "#b42318" }}>{error}</p>}

      {needsWpConnect && (
        <div
          style={{
            marginBottom: 20,
            padding: 14,
            borderRadius: 10,
            border: "1px solid #f5c26b",
            background: "rgba(221,107,32,0.1)",
            fontSize: 14,
          }}
        >
          <strong>WordPress is not connected.</strong> Scan works, but live Deploy
          needs the AI-Growth-OS plugin + site token.{" "}
          <button
            type="button"
            style={linkBtn}
            onClick={() => router.push("/sites/connect")}
          >
            Connect WordPress →
          </button>
        </div>
      )}

      {isLiveUrlOnly && (
        <div
          style={{
            marginBottom: 20,
            padding: 14,
            borderRadius: 10,
            border: "1px solid #93c5fd",
            background: "rgba(37,99,235,0.08)",
            fontSize: 14,
          }}
        >
          <strong>Live URL cannot change the real page.</strong> Approve/Deploy here
          only creates an apply guide. To make SEO · AEO · GEO · AI-visibility fixes
          appear on the live site, reconnect as{" "}
          <strong>WordPress</strong> (plugin writes live) or <strong>GitHub</strong>{" "}
          (PR writes <code>public/llms.txt</code>, robots, sitemap, head/metadata
          helpers — merge + redeploy).{" "}
          <button
            type="button"
            style={linkBtn}
            onClick={() => router.push("/sites/connect")}
          >
            Connect for live apply →
          </button>
        </div>
      )}

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 16, margin: "0 0 8px" }}>Automation</h2>
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--color-text-muted)" }}>
          Weekly re-scan (Mon 09:00 UTC) and safe auto-apply (Phase 7).
        </p>
        {site && (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <label style={{ fontSize: 13 }}>
              Schedule{" "}
              <select
                value={String(site.settings?.schedule ?? "weekly")}
                onChange={async (e) => {
                  const token = localStorage.getItem(TOKEN_KEY);
                  if (!token) return;
                  setBusy(true);
                  try {
                    const next = await apiPatchSiteSettings(token, id, {
                      schedule: e.target.value as "weekly" | "manual",
                    });
                    setSite(next);
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Settings failed");
                  } finally {
                    setBusy(false);
                  }
                }}
                style={{ marginLeft: 8, height: 32 }}
              >
                <option value="weekly">Weekly</option>
                <option value="manual">Manual only</option>
              </select>
            </label>
            <label style={{ fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={Boolean(site.settings?.safe_auto_apply)}
                onChange={async (e) => {
                  const token = localStorage.getItem(TOKEN_KEY);
                  if (!token) return;
                  setBusy(true);
                  try {
                    const next = await apiPatchSiteSettings(token, id, {
                      safe_auto_apply: e.target.checked,
                    });
                    setSite(next);
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Settings failed");
                  } finally {
                    setBusy(false);
                  }
                }}
              />
              Safe auto-apply (safe class only)
            </label>
          </div>
        )}
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 16, margin: "0 0 8px" }}>Growth pillars</h2>
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--color-text-muted)" }}>
          SEO (search) · AEO (answer engines) · GEO (AI / generative visibility).
          AI-visibility score: {pillars.aiVisibility}.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          {(
            [
              ["Overall", pillars.overall],
              ["SEO", pillars.seo],
              ["AEO", pillars.aeo],
              ["GEO", pillars.geo],
            ] as const
          ).map(([label, value]) => (
            <div
              key={label}
              style={{
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
              }}
            >
              <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 650, marginTop: 4 }}>{value}</div>
            </div>
          ))}
        </div>
        <ul
          style={{
            margin: "14px 0 0",
            paddingLeft: 18,
            fontSize: 13,
            color: "var(--color-text-muted)",
            lineHeight: 1.5,
          }}
        >
          <li>Covered now: titles, meta, canonical, FAQ, Open Graph, llms.txt, robots, sitemap drafts</li>
          <li>Detect + guide: viewport, TTFB (host tips), alt, thin content, security headers, links</li>
          <li>Keywords / SERP / web research: Run research below (Tavily + SERP keys)</li>
          <li>Later: backlinks graph, full content writing, CWV lab</li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 16, margin: "0 0 8px" }}>Keywords & web research</h2>
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--color-text-muted)" }}>
          Uses your <strong>Tavily</strong> + <strong>SERP</strong> keys for related keywords,
          Google results, and research snippets. After research, Apply creates approved SEO/AEO/GEO
          proposals ready to Deploy (WordPress or GitHub).
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <input
            value={researchQuery}
            onChange={(e) => setResearchQuery(e.target.value)}
            placeholder={site ? `${site.domain} keywords…` : "Keyword or topic"}
            style={{
              flex: "1 1 220px",
              height: 40,
              padding: "0 12px",
              borderRadius: 8,
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
              color: "var(--color-text)",
            }}
          />
          <button
            type="button"
            style={primaryBtn}
            disabled={Boolean(actionId) || busy}
            onClick={onRunResearch}
          >
            {actionId === "research" ? "Researching…" : "Run research"}
          </button>
          <button
            type="button"
            style={secondaryBtn}
            disabled={!research || Boolean(actionId) || busy}
            onClick={onApplyResearch}
          >
            {actionId === "research-apply"
              ? "Applying…"
              : "Apply research → proposals"}
          </button>
        </div>
        {researchConfigured && (
          <p style={{ fontSize: 12, color: "var(--color-text-muted)", margin: "0 0 12px" }}>
            Keys: Tavily {researchConfigured.tavily ? "on" : "off"} · SERP{" "}
            {researchConfigured.serp ? "on" : "off"}
            {research?.configured.serpProvider
              ? ` (${research.configured.serpProvider})`
              : ""}
          </p>
        )}
        {research?.errors?.length ? (
          <p style={{ color: "#b42318", fontSize: 13 }}>
            {research.errors.join(" · ")}
          </p>
        ) : null}
        {!research ? (
          <p style={{ color: "var(--color-text-muted)", fontSize: 14 }}>
            No research yet — run once to pull keywords and SERP context.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Suggested keywords
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {research.keywords.slice(0, 12).map((k) => (
                  <span
                    key={`${k.source}-${k.phrase}`}
                    style={{
                      fontSize: 12,
                      padding: "4px 8px",
                      borderRadius: 999,
                      border: "1px solid var(--color-border)",
                      background: "var(--color-surface)",
                    }}
                    title={k.source}
                  >
                    {k.phrase}
                  </span>
                ))}
              </div>
            </div>
            {research.suggestions.length > 0 && (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.5 }}>
                {research.suggestions.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            )}
            {research.serpResults.length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  Top Google results
                </div>
                <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.45 }}>
                  {research.serpResults.slice(0, 5).map((r) => (
                    <li key={r.link || r.title} style={{ marginBottom: 6 }}>
                      <a href={r.link} target="_blank" rel="noreferrer">
                        {r.title || r.link}
                      </a>
                      {r.snippet ? (
                        <div style={{ color: "var(--color-text-muted)" }}>{r.snippet}</div>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {research.research.length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  Tavily research
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.45 }}>
                  {research.research.slice(0, 5).map((r) => (
                    <li key={r.url} style={{ marginBottom: 6 }}>
                      <a href={r.url} target="_blank" rel="noreferrer">
                        {r.title || r.url}
                      </a>
                      {r.content ? (
                        <div style={{ color: "var(--color-text-muted)" }}>{r.content}</div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p style={{ margin: 0, fontSize: 11, color: "var(--color-text-muted)" }}>
              Last run {new Date(research.ranAt).toLocaleString()} · query “{research.query}”
            </p>
          </div>
        )}
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 16, margin: "0 0 8px" }}>Top fixes for your site</h2>
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--color-text-muted)" }}>
          Plain-language priorities from the latest scan — what hurts, why, and what to do.
        </p>
        {topFixes.length === 0 ? (
          <p style={{ color: "var(--color-text-muted)", fontSize: 14 }}>
            Run a scan to see prioritized fixes.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {topFixes.map((fix) => (
              <article
                key={fix.issueType}
                style={{
                  padding: 14,
                  borderRadius: 10,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                    marginBottom: 6,
                  }}
                >
                  <strong style={{ fontSize: 14 }}>{fix.guide.title}</strong>
                  <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                    {fix.count} page{fix.count === 1 ? "" : "s"} ·{" "}
                    {fix.guide.autoFixable ? "Auto-fix available" : "Manual fix"}
                  </span>
                </div>
                <p style={{ margin: "0 0 6px", fontSize: 13 }}>{fix.guide.why}</p>
                <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)" }}>
                  <strong>How to fix:</strong> {fix.guide.howToFix}
                </p>
                {fix.guide.autoFixable && pending.length > 0 && (
                  <p style={{ margin: "8px 0 0", fontSize: 13 }}>
                    → Review matching items under <strong>AI proposals</strong> below.
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 16, margin: "0 0 12px" }}>
          AI proposals {pending.length ? `(${pending.length} to review)` : ""}
        </h2>
        {pending.length > 0 && (
          <div
            style={{
              marginBottom: 12,
              padding: 12,
              borderRadius: 8,
              border: "1px solid var(--color-warning)",
              background: "rgba(221,107,32,0.08)",
              fontSize: 14,
            }}
          >
            <strong>Next step (&lt; 5 min):</strong> Approve a highlighted proposal,
            then <strong>Deploy</strong> — verify shows before → after proof.
          </div>
        )}
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--color-text-muted)" }}>
          Review before/after. {deployHelp(site?.connectionType)} Auto-fix now covers
          title, meta, canonical, FAQ, Open Graph, llms.txt, robots.txt, and sitemap templates.
        </p>
        {deployable.length > 0 && (
          <button
            type="button"
            style={{ ...primaryBtn, marginBottom: 12 }}
            disabled={busy}
            onClick={() => onDeploy()}
          >
            {busy ? "Deploying…" : `Deploy all approved (${deployable.length})`}
          </button>
        )}
        {proposals.length === 0 ? (
          <p style={{ color: "var(--color-text-muted)", fontSize: 14 }}>
            {issues.length > 0
              ? `No auto-fix proposals yet for this scan. See Top fixes above for manual guidance.`
              : "No proposals yet. Run a scan to generate safe fixes."}
          </p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {orderedProposals.map((p) => (
              <article
                key={p.id}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  border: highlightedIds.has(p.id)
                    ? "1px solid var(--color-primary)"
                    : "1px solid var(--color-border)",
                  background: "var(--color-surface)",
                  display: "grid",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <strong style={{ textTransform: "capitalize" }}>
                    {highlightedIds.has(p.id) ? "★ " : ""}
                    {p.proposalType.replace(/_/g, " ")}
                    {highlightedIds.has(p.id) ? " · recommended" : ""}
                  </strong>
                  <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                    {p.status.replace(/_/g, " ")} · {p.changeClass} · {p.source}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 13 }}>{p.businessImpact}</p>
                <div style={{ fontSize: 12, fontFamily: "var(--font-mono)" }}>
                  <div style={{ color: "var(--color-text-muted)" }}>Before</div>
                  <div style={{ whiteSpace: "pre-wrap", marginBottom: 8 }}>
                    {p.beforeValue || "(empty)"}
                  </div>
                  <div style={{ color: "var(--color-text-muted)" }}>After</div>
                  <div style={{ whiteSpace: "pre-wrap" }}>{p.afterValue}</div>
                </div>
                {p.status === "pending_review" && p.changeClass !== "blocked" && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      style={primaryBtn}
                      disabled={actionId === p.id}
                      onClick={() => onApprove(p.id)}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      style={secondaryBtn}
                      disabled={actionId === p.id}
                      onClick={() => onReject(p.id)}
                    >
                      Reject
                    </button>
                  </div>
                )}
                {p.status === "approved" && p.patchId && (
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button
                      type="button"
                      style={primaryBtn}
                      disabled={busy}
                      onClick={() => onDeploy(p.patchId!)}
                    >
                      Deploy
                    </button>
                    <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                      Patch {p.patchId.slice(0, 8)}…
                    </span>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 16, margin: "0 0 12px" }}>Deployments</h2>
        {deployments.length === 0 ? (
          <p style={{ color: "var(--color-text-muted)", fontSize: 14 }}>
            No deployments yet. Approve a proposal, then deploy.
          </p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
            {deployments.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => router.push(`/deployments/${d.id}`)}
                  style={rowBtn}
                >
                  <span>
                    {d.action} · {d.proposalType?.replace(/_/g, " ") ?? "patch"} ·{" "}
                    {d.status}
                    {d.deployMode ? ` · ${d.deployMode}` : ""}
                  </span>
                  <span style={{ color: "var(--color-text-muted)", fontSize: 13 }}>
                    {new Date(d.createdAt).toLocaleString()}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 16, margin: "0 0 12px" }}>Scan history</h2>
        {jobs.length === 0 ? (
          <p style={{ color: "var(--color-text-muted)", fontSize: 14 }}>
            No scans yet.
          </p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
            {jobs.map((j) => (
              <li key={j.id}>
                <button
                  type="button"
                  onClick={() => router.push(`/job-runs/${j.id}`)}
                  style={rowBtn}
                >
                  <span>{j.status}</span>
                  <span style={{ color: "var(--color-text-muted)", fontSize: 13 }}>
                    {j.pageCount ?? 0} pages · {j.issueCount ?? 0} issues ·{" "}
                    {new Date(j.createdAt).toLocaleString()}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 style={{ fontSize: 16, margin: "0 0 12px" }}>Issues (latest)</h2>
        {issues.length === 0 ? (
          <p style={{ color: "var(--color-text-muted)", fontSize: 14 }}>
            No issues stored yet.
          </p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
            {issues.map((iss) => {
              const guide = getIssueOwnerGuide(iss.issueType);
              return (
                <li
                  key={iss.id}
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    border: "1px solid var(--color-border)",
                    background: "var(--color-surface)",
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {guide.title}{" "}
                    <span
                      style={{
                        fontWeight: 400,
                        color: "var(--color-text-muted)",
                        textTransform: "capitalize",
                      }}
                    >
                      · {iss.severity}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
                    {iss.pageUrl ?? "site-level"}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 6 }}>{guide.why}</div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
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
  color: "var(--color-text)",
  fontWeight: 600,
  cursor: "pointer",
};

const dangerBtn: React.CSSProperties = {
  height: 40,
  padding: "0 16px",
  borderRadius: 8,
  border: "1px solid #f0b4b4",
  background: "transparent",
  color: "var(--color-error)",
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

const rowBtn: React.CSSProperties = {
  width: "100%",
  textAlign: "left",
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  padding: "12px 14px",
  borderRadius: 8,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface)",
  cursor: "pointer",
  color: "inherit",
};
