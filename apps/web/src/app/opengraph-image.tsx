import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "growthOS — AI SEO, AEO & GEO growth engine";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "linear-gradient(145deg, #0b1220 0%, #0f2744 55%, #0d9488 160%)",
          color: "#f8fafc",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "#0066ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 800,
            }}
          >
            g
          </div>
          <div style={{ display: "flex", fontSize: 36, fontWeight: 700 }}>
            <span style={{ color: "#e2e8f0" }}>growth</span>
            <span style={{ color: "#5eead4" }}>OS</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              display: "flex",
              fontSize: 64,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              maxWidth: 980,
            }}
          >
            AI SEO fixes that never write without you
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 28,
              color: "#cbd5e1",
              maxWidth: 860,
              lineHeight: 1.35,
            }}
          >
            Scan SEO · AEO · GEO — approve before write, verify live HTML,
            auto-rollback if it fails.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 22,
            color: "#94a3b8",
          }}
        >
          <span>grothos.in</span>
          <span>Connect → Scan → Approve → Deploy</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
