"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BrandMark } from "@/components/landing/BrandMark";
import {
  apiSearch,
  TOKEN_KEY,
  type SearchHit,
} from "@/lib/api";
import { useTheme } from "@/lib/theme";

const NAV = [
  { label: "Mission Control", href: "/dashboard" },
  { label: "Connect", href: "/sites/connect" },
  { label: "Billing", href: "/billing" },
  { label: "Team", href: "/team" },
] as const;

type Props = {
  children: React.ReactNode;
  orgId?: string;
  orgName?: string;
  userLabel?: string;
};

export function AppShell({ children, orgId, orgName, userLabel }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    if (!orgId || q.trim().length < 2) {
      setHits([]);
      return;
    }
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    const t = setTimeout(() => {
      apiSearch(token, orgId, q)
        .then((res) => {
          setHits(res.results);
          setOpen(true);
        })
        .catch(() => setHits([]));
    }, 220);
    return () => clearTimeout(t);
  }, [q, orgId]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    router.push("/login");
  }

  return (
    <div className="app-shell" style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        className="app-nav"
        style={{
          width: "var(--shell-nav)",
          borderRight: "1px solid var(--color-border)",
          background: "var(--color-surface)",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div style={{ margin: "4px 0 16px" }}>
          <BrandMark variant="header" href="/dashboard" />
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 12,
              color: "var(--color-text-muted)",
            }}
          >
            Mission Control
          </p>
        </div>
        <nav
          className="app-nav-links"
          style={{ display: "flex", flexDirection: "column", gap: 4 }}
        >
          {NAV.map((item) => {
            const active =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <button
                key={item.href}
                type="button"
                className={`app-nav-item${active ? " is-active" : ""}`}
                onClick={() => router.push(item.href)}
                style={{
                  textAlign: "left",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "none",
                  fontSize: 14,
                  fontWeight: active ? 600 : 400,
                  cursor: "pointer",
                  background: active ? "rgba(0,102,255,0.1)" : "transparent",
                  color: active ? "var(--color-primary)" : "var(--color-text)",
                }}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
        <div style={{ marginTop: "auto", display: "grid", gap: 8 }}>
          <button
            type="button"
            className="app-ghost-btn"
            onClick={toggle}
            style={ghostBtn}
          >
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
          <button
            type="button"
            className="app-ghost-btn"
            onClick={logout}
            style={ghostBtn}
          >
            Log out
          </button>
        </div>
      </aside>

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <header
          className="app-topbar"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 24px",
            borderBottom: "1px solid var(--color-border)",
            background: "var(--color-surface)",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: "1 1 160px", minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>
              {orgName ?? "Workspace"}
            </div>
            {userLabel && (
              <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                {userLabel}
              </div>
            )}
          </div>
          <div ref={boxRef} style={{ position: "relative", flex: "2 1 240px" }}>
            <label htmlFor="mc-search" className="sr-only" style={srOnly}>
              Search
            </label>
            <input
              id="mc-search"
              className="app-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => hits.length && setOpen(true)}
              placeholder="Search sites, proposals, deployments…"
              aria-label="Global search"
              style={{
                width: "100%",
                height: 40,
                padding: "0 12px",
                borderRadius: 8,
                border: "1px solid var(--color-border)",
                background: "var(--color-bg)",
                color: "var(--color-text)",
                fontSize: 14,
              }}
            />
            {open && hits.length > 0 && (
              <ul
                role="listbox"
                style={{
                  position: "absolute",
                  zIndex: 40,
                  top: 44,
                  left: 0,
                  right: 0,
                  margin: 0,
                  padding: 6,
                  listStyle: "none",
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  maxHeight: 320,
                  overflow: "auto",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                }}
              >
                {hits.map((h) => (
                  <li key={`${h.type}-${h.id}`}>
                    <button
                      type="button"
                      className="app-search-hit"
                      role="option"
                      onClick={() => {
                        setOpen(false);
                        setQ("");
                        router.push(h.href);
                      }}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        border: "none",
                        background: "transparent",
                        padding: "8px 10px",
                        borderRadius: 6,
                        cursor: "pointer",
                        color: "var(--color-text)",
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        {h.title}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--color-text-muted)",
                        }}
                      >
                        {h.type} · {h.subtitle}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </header>
        <main style={{ flex: 1, padding: 24, maxWidth: 1440, width: "100%", margin: "0 auto" }}>
          {children}
        </main>
      </div>
    </div>
  );
}

const ghostBtn: React.CSSProperties = {
  height: 36,
  borderRadius: 8,
  border: "1px solid var(--color-border)",
  background: "transparent",
  cursor: "pointer",
  fontSize: 13,
  color: "var(--color-text)",
};

const srOnly: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  border: 0,
};
