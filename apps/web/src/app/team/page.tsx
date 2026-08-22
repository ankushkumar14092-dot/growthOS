"use client";

import { AppShell } from "@/components/AppShell";
import { useWorkspace } from "@/lib/use-workspace";

export default function TeamPage() {
  const { me, org, orgId, role, userLabel, ready } = useWorkspace();

  if (!ready || !me) {
    return (
      <div style={{ padding: 32, color: "var(--color-text-muted)" }}>
        Loading team…
      </div>
    );
  }

  return (
    <AppShell orgId={orgId} orgName={org?.name} userLabel={userLabel}>
      <header style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600 }}>Team</h1>
        <p
          style={{
            margin: "10px 0 0",
            fontSize: 15,
            lineHeight: 1.55,
            color: "var(--color-text-muted)",
            maxWidth: "48ch",
          }}
        >
          People in this workspace. Invites and roles expand in a later release.
        </p>
      </header>

      <section
        className="app-panel"
        style={{
          padding: 22,
          borderRadius: 12,
          border: "1px solid var(--color-border)",
          background: "var(--color-surface)",
          maxWidth: 640,
        }}
      >
        <h2 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 600 }}>
          Members
        </h2>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12 }}>
          {me.memberships.map((m) => (
            <li
              key={m.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                padding: "14px 16px",
                borderRadius: 10,
                border: "1px solid var(--color-border)",
                background: "var(--color-bg)",
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>
                  {(me.profile as { name?: string })?.name ?? me.email}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--color-text-muted)",
                    marginTop: 4,
                  }}
                >
                  {me.email} · {m.organization.name}
                </div>
              </div>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--color-primary)",
                  textTransform: "capitalize",
                  alignSelf: "center",
                }}
              >
                {m.role}
              </span>
            </li>
          ))}
        </ul>
        <p
          style={{
            margin: "18px 0 0",
            fontSize: 13,
            lineHeight: 1.5,
            color: "var(--color-text-muted)",
          }}
        >
          Your role here: <strong>{role}</strong>. Multi-seat invites coming soon.
        </p>
      </section>
    </AppShell>
  );
}
