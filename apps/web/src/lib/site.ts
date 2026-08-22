/** Canonical public site URL for metadata, sitemap, robots, llms.txt */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/\/$/, "")}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  return "https://grothos.vercel.app";
}

export const SITE_NAME = "AI-Growth-OS";
export const SITE_TAGLINE =
  "SEO · AEO · GEO (AI-visibility) — connect, scan, approve, deploy, verify, and rollback.";
