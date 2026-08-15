"use client";

type Chip = {
  label: string;
  ok: boolean;
  hint?: string;
};

export function TrustStrip(props: {
  verified?: boolean;
  safe?: boolean;
  rollbackAvailable?: boolean;
  backupStored?: boolean;
}) {
  const chips: Chip[] = [
    {
      label: "Verified",
      ok: Boolean(props.verified),
      hint: props.verified ? "Live HTML matched" : "Not verified yet",
    },
    {
      label: "Safe",
      ok: props.safe !== false,
      hint: "change_class allows apply",
    },
    {
      label: "Rollback available",
      ok: Boolean(props.rollbackAvailable),
    },
    {
      label: "Backup stored",
      ok: Boolean(props.backupStored),
    },
  ];

  return (
    <div
      role="group"
      aria-label="Trust indicators"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
      }}
    >
      {chips.map((c) => (
        <span
          key={c.label}
          title={c.hint}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 10px",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 500,
            border: `1px solid ${c.ok ? "var(--color-success)" : "var(--color-border)"}`,
            color: c.ok ? "var(--color-success)" : "var(--color-text-muted)",
            background: c.ok ? "rgba(56,161,105,0.08)" : "transparent",
          }}
        >
          <span aria-hidden>{c.ok ? "✓" : "·"}</span>
          {c.label}
        </span>
      ))}
    </div>
  );
}
