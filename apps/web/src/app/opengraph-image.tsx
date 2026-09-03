import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "GrowthOS logo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Share preview: logo is the hero — not a text-heavy card. */
export default async function OpenGraphImage() {
  const logoPath = join(process.cwd(), "public", "logo-mark.png");
  const buf = await readFile(logoPath);
  const logoSrc = `data:image/png;base64,${buf.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          gap: 32,
        }}
      >
        <img
          alt="GrowthOS logo"
          width={640}
          height={464}
          src={logoSrc}
          style={{
            width: 640,
            height: 464,
            objectFit: "contain",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            fontSize: 52,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <span style={{ color: "#0b1220" }}>Growth</span>
          <span style={{ color: "#0d9488" }}>OS</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
