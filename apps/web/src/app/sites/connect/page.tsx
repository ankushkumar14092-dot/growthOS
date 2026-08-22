"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  apiConnectSite,
  apiConnectionTypes,
  apiCreateSite,
  apiMe,
  apiStartAudit,
  apiUploadZip,
  TOKEN_KEY,
  type ConnectionType,
  type ConnectionTypeInfo,
  type MeResponse,
} from "@/lib/api";
import { trackEvent } from "@/lib/analytics";

type Step = "choose" | "details" | "auth" | "done";

const FALLBACK_TYPES: ConnectionTypeInfo[] = [
  {
    type: "wordpress",
    label: "WordPress",
    summary: "Plugin — live write, verify HTML, rollback",
    canAnalyze: true,
    canDeploy: true,
    canVerify: true,
    canRollback: true,
    deployMode: "wordpress_live",
  },
  {
    type: "github",
    label: "GitHub Repository",
    summary: "Opens a PR with the SEO fix; close PR to roll back",
    canAnalyze: true,
    canDeploy: true,
    canVerify: true,
    canRollback: true,
    deployMode: "github_pr",
  },
  {
    type: "zip",
    label: "ZIP Upload",
    summary: "Packages a downloadable fix pack (no live host write)",
    canAnalyze: true,
    canDeploy: true,
    canVerify: false,
    canRollback: true,
    deployMode: "zip_artifact",
  },
  {
    type: "url_audit",
    label: "Live Website URL",
    summary: "Exports apply guide + rechecks live HTML (cannot write remotely)",
    canAnalyze: true,
    canDeploy: true,
    canVerify: true,
    canRollback: true,
    deployMode: "url_guide",
  },
];

export default function ConnectSitePage() {
  const router = useRouter();
  const [isFirst, setIsFirst] = useState(false);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [types, setTypes] = useState<ConnectionTypeInfo[]>(FALLBACK_TYPES);
  const [step, setStep] = useState<Step>("choose");
  const [connType, setConnType] = useState<ConnectionType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [domain, setDomain] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [repo, setRepo] = useState("");
  const [wpKind, setWpKind] = useState<"plugin_token" | "app_password">(
    "plugin_token",
  );
  const [secret, setSecret] = useState("");
  const [username, setUsername] = useState("");
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [resultNote, setResultNote] = useState("");
  const [healthOk, setHealthOk] = useState(false);
  const [startingScan, setStartingScan] = useState(false);

  useEffect(() => {
    setIsFirst(new URLSearchParams(window.location.search).get("first") === "1");
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      router.replace("/login");
      return;
    }
    Promise.all([apiMe(token), apiConnectionTypes(token).catch(() => FALLBACK_TYPES)])
      .then(([data, list]) => {
        if (data.memberships.length === 0) {
          router.replace("/onboarding");
          return;
        }
        setMe(data);
        setTypes(list);
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  const selected = types.find((t) => t.type === connType) ?? null;

  async function onCreateDetails(e: FormEvent) {
    e.preventDefault();
    const token = localStorage.getItem(TOKEN_KEY);
    const orgId = me?.memberships[0]?.organization.id;
    if (!token || !orgId || !connType) return;
    setError(null);
    setLoading(true);
    try {
      const site = await apiCreateSite(token, {
        organizationId: orgId,
        connectionType: connType,
        domain:
          connType === "github"
            ? repo || domain
            : connType === "url_audit"
              ? baseUrl || domain
              : domain,
        ...(baseUrl.trim() ? { baseUrl: baseUrl.trim() } : {}),
        ...(connType === "github" ? { repo: repo || domain } : {}),
      });
      setSiteId(site.id);
      if (connType === "url_audit") {
        const result = await apiConnectSite(token, site.id, {
          kind: "url_audit",
        });
        setHealthOk(result.health.ok);
        setResultNote(
          result.health.ok
            ? "URL reachable — ready for instant audit (read-only)."
            : `URL check failed: ${result.health.error ?? "unreachable"}`,
        );
        if (result.health.ok) {
          trackEvent("website_connected", { type: "url_audit" }, {
            organizationId: orgId,
            userId: me?.id,
          });
        }
        setStep("done");
        if (result.health.ok) {
          await beginFirstScan(token, site.id);
          return;
        }
      } else {
        setStep("auth");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create site");
    } finally {
      setLoading(false);
    }
  }

  async function beginFirstScan(token: string, id: string) {
    setStartingScan(true);
    try {
      trackEvent("scan_started", { siteId: id, auto: true }, {
        organizationId: me?.memberships[0]?.organization.id,
        userId: me?.id,
      });
      const job = await apiStartAudit(token, id);
      router.push(`/job-runs/${job.id}?first=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start scan");
      setStartingScan(false);
      setStep("done");
    }
  }

  async function onAuth(e: FormEvent) {
    e.preventDefault();
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token || !siteId || !connType) return;
    setError(null);
    setLoading(true);
    try {
      if (connType === "zip") {
        if (!zipFile) throw new Error("Choose a .zip file");
        const result = await apiUploadZip(token, siteId, zipFile);
        setHealthOk(result.health.ok);
        setResultNote(
          `Detected ${result.detected.framework} (${result.detected.filename}). First scan starting…`,
        );
        trackEvent("website_connected", { type: "zip" }, {
          organizationId: me?.memberships[0]?.organization.id,
          userId: me?.id,
        });
        setStep("done");
        if (result.health.ok) {
          await beginFirstScan(token, siteId);
          return;
        }
        return;
      }

      if (connType === "wordpress") {
        const result = await apiConnectSite(token, siteId, {
          kind: wpKind,
          token: secret,
          ...(wpKind === "app_password" ? { username } : {}),
        });
        setHealthOk(result.health.ok);
        setResultNote(
          result.health.ok
            ? "WordPress connected — starting your first scan…"
            : `Health failed: ${result.health.error ?? "check plugin/token"}`,
        );
        if (result.health.ok) {
          trackEvent("website_connected", { type: "wordpress" }, {
            organizationId: me?.memberships[0]?.organization.id,
            userId: me?.id,
          });
          setStep("done");
          await beginFirstScan(token, siteId);
          return;
        }
      } else if (connType === "github") {
        const result = await apiConnectSite(token, siteId, {
          kind: "github_token",
          token: secret,
          repo: repo || domain,
        });
        setHealthOk(result.health.ok);
        setResultNote(
          result.health.ok
            ? "GitHub connected — starting first scan…"
            : `GitHub check failed: ${result.health.error ?? "token/repo"}`,
        );
        if (result.health.ok) {
          trackEvent("website_connected", { type: "github" }, {
            organizationId: me?.memberships[0]?.organization.id,
            userId: me?.id,
          });
          setStep("done");
          await beginFirstScan(token, siteId);
          return;
        }
      }
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connect failed");
    } finally {
      setLoading(false);
    }
  }

  if (!me) {
    return (
      <div style={{ padding: 32, color: "var(--color-text-muted)" }}>
        Loading…
      </div>
    );
  }

  return (
    <main className="auth-page" style={pageStyle}>
      <div className="app-panel" style={cardStyle}>
        <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)" }}>
          Connect Website
        </p>
        <h1 style={titleStyle}>
          {step === "choose" &&
            (isFirst ? "Connect your first website" : "How do you want to connect?")}
          {step === "details" && selected?.label}
          {step === "auth" && "Authenticate"}
          {step === "done" &&
            (startingScan
              ? "Starting first scan…"
              : healthOk
                ? "Connected"
                : "Needs attention")}
        </h1>
        {isFirst && step === "choose" && (
          <p style={hintStyle}>
            Recommended for beta: <strong>WordPress</strong> (full deploy loop) or{" "}
            <strong>Live URL</strong> (fastest read-only scan).
          </p>
        )}
        {step === "auth" && connType === "wordpress" && (
          <p style={hintStyle}>
            Need the plugin? Follow <code>docs/PLUGIN-INSTALL.md</code>. Local
            staging: <code>npm run wp:up</code> → site at{" "}
            <code>http://localhost:8080</code>. Set{" "}
            <code>MOCK_WP_HEALTH=0</code> in the API env for a real trust loop.
            Beta rule: do not demo with mocks — real WordPress + plugin only.
          </p>
        )}

        {step === "choose" && (
          <div style={{ display: "grid", gap: 10 }}>
            {types.map((t) => (
              <button
                key={t.type}
                type="button"
                onClick={() => {
                  setConnType(t.type);
                  setStep("details");
                  setError(null);
                }}
                style={optionBtn}
              >
                <span style={{ fontWeight: 600 }}>{t.label}</span>
                <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                  {t.summary}
                </span>
                <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                  {[
                    t.canAnalyze && "Analyze",
                    t.canDeploy && "Deploy",
                    t.canVerify && "Verify",
                    t.canRollback && "Rollback",
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Read-only"}
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              style={secondaryBtn}
            >
              Cancel
            </button>
          </div>
        )}

        {step === "details" && connType && (
          <form onSubmit={onCreateDetails} style={{ display: "grid", gap: 14 }}>
            {connType === "wordpress" && (
              <>
                <label style={labelStyle}>
                  Domain
                  <input
                    required
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    placeholder="example.com"
                    style={inputStyle}
                  />
                </label>
                <label style={labelStyle}>
                  Base URL (optional)
                  <input
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="http://localhost:8080"
                    style={inputStyle}
                  />
                </label>
              </>
            )}
            {connType === "github" && (
              <label style={labelStyle}>
                Repository
                <input
                  required
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  placeholder="owner/repo or https://github.com/owner/repo"
                  style={inputStyle}
                />
              </label>
            )}
            {connType === "zip" && (
              <label style={labelStyle}>
                Project name
                <input
                  required
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="my-marketing-site"
                  style={inputStyle}
                />
              </label>
            )}
            {connType === "url_audit" && (
              <label style={labelStyle}>
                Live website URL
                <input
                  required
                  value={baseUrl || domain}
                  onChange={(e) => {
                    setBaseUrl(e.target.value);
                    setDomain(e.target.value);
                  }}
                  placeholder="https://example.com"
                  style={inputStyle}
                />
              </label>
            )}
            {error && <p style={errorStyle}>{error}</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => setStep("choose")}
                style={secondaryBtn}
              >
                Back
              </button>
              <button type="submit" disabled={loading} style={primaryBtn}>
                {loading
                  ? "Working…"
                  : connType === "url_audit"
                    ? "Check URL"
                    : "Continue"}
              </button>
            </div>
          </form>
        )}

        {step === "auth" && connType && (
          <form onSubmit={onAuth} style={{ display: "grid", gap: 14 }}>
            {connType === "wordpress" && (
              <>
                <ol
                  style={{
                    margin: 0,
                    paddingLeft: 18,
                    fontSize: 14,
                    lineHeight: 1.6,
                  }}
                >
                  <li>Install the AI-Growth-OS plugin</li>
                  <li>Copy the site token from Settings → AI-Growth-OS</li>
                </ol>
                <label style={labelStyle}>
                  Auth method
                  <select
                    value={wpKind}
                    onChange={(e) =>
                      setWpKind(e.target.value as "plugin_token" | "app_password")
                    }
                    style={inputStyle}
                  >
                    <option value="plugin_token">Plugin site token</option>
                    <option value="app_password">Application Password</option>
                  </select>
                </label>
                {wpKind === "app_password" && (
                  <label style={labelStyle}>
                    WP username
                    <input
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      style={inputStyle}
                    />
                  </label>
                )}
                <label style={labelStyle}>
                  {wpKind === "plugin_token" ? "Site token" : "Application password"}
                  <input
                    required
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    style={inputStyle}
                    autoComplete="off"
                  />
                </label>
              </>
            )}
            {connType === "github" && (
              <label style={labelStyle}>
                GitHub personal access token
                <input
                  required
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  style={inputStyle}
                  autoComplete="off"
                  placeholder="ghp_…"
                />
              </label>
            )}
            {connType === "zip" && (
              <label style={labelStyle}>
                Upload website.zip
                <input
                  required
                  type="file"
                  accept=".zip,application/zip"
                  onChange={(e) => setZipFile(e.target.files?.[0] ?? null)}
                  style={{ ...inputStyle, paddingTop: 8, height: "auto" }}
                />
              </label>
            )}
            {error && <p style={errorStyle}>{error}</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => setStep("details")}
                style={secondaryBtn}
              >
                Back
              </button>
              <button type="submit" disabled={loading} style={primaryBtn}>
                {loading ? "Connecting…" : "Connect & verify"}
              </button>
            </div>
          </form>
        )}

        {step === "done" && (
          <div style={{ display: "grid", gap: 14 }}>
            <p style={{ margin: 0, fontSize: 15 }}>{resultNote}</p>
            {startingScan && (
              <p style={hintStyle}>Launching scan — you’ll see the Mission Timeline next.</p>
            )}
            {selected && !startingScan && (
              <p style={hintStyle}>
                Capabilities:{" "}
                {[
                  selected.canAnalyze && "Analyze",
                  selected.canDeploy && "Deploy",
                  selected.canVerify && "Verify",
                  selected.canRollback && "Rollback",
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
            {!startingScan && healthOk && siteId && (
              <button
                type="button"
                style={primaryBtn}
                onClick={() => {
                  const token = localStorage.getItem(TOKEN_KEY);
                  if (token) void beginFirstScan(token, siteId);
                }}
              >
                Start first scan
              </button>
            )}
            {!startingScan && (
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                style={secondaryBtn}
              >
                Go to Mission Control
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  padding: 24,
  background:
    "radial-gradient(1200px 600px at 10% -10%, rgba(0,168,150,0.12), transparent), var(--color-bg)",
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 520,
  padding: 28,
  borderRadius: 12,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface)",
  display: "grid",
  gap: 12,
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 24,
  fontWeight: 600,
  color: "var(--color-navy)",
};

const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  fontSize: 13,
  fontWeight: 500,
};

const inputStyle: React.CSSProperties = {
  height: 40,
  padding: "0 12px",
  borderRadius: 8,
  border: "1px solid var(--color-border)",
  fontSize: 14,
};

const hintStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 13,
  color: "var(--color-text-muted)",
};

const errorStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 13,
  color: "#b42318",
};

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
};

const optionBtn: React.CSSProperties = {
  display: "grid",
  gap: 4,
  textAlign: "left",
  padding: 14,
  borderRadius: 10,
  border: "1px solid var(--color-border)",
  background: "var(--color-bg)",
  cursor: "pointer",
};
