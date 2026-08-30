export default function DashboardLoading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--color-text-muted)",
        fontSize: 14,
      }}
      aria-live="polite"
      aria-busy="true"
    >
      Loading Mission Control…
    </div>
  );
}
