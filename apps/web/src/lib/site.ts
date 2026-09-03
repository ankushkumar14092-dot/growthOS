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
  // Custom domain (production). Fallback until NEXT_PUBLIC_SITE_URL is set on Vercel.
  return "https://grothos.in";
}

/** Primary brand name — use everywhere in UI, SEO, and billing */
export const BRAND_NAME = "growthOS";
/** @deprecated Use BRAND_NAME */
export const SEARCH_DISPLAY_NAME = BRAND_NAME;
/** Product codename / legacy name */
export const PRODUCT_NAME = "AI-Growth-OS";
export const SITE_NAME = BRAND_NAME;
export const SITE_DISPLAY = BRAND_NAME;
export const SITE_TAGLINE =
  "growthOS scans SEO · AEO · GEO issues and only writes after you approve — then verifies live HTML and rolls back if something breaks.";
export const SITE_KEYWORDS = [
  "growthOS",
  "growthos",
  "AI-Growth-OS",
  "SEO tool",
  "AEO",
  "GEO",
  "AI visibility",
  "WordPress SEO",
  "website growth",
];

export const GITHUB_URL =
  "https://github.com/ankushkumar14092-dot/growthOS";

/** Google Search Console HTML-file verification (also served at /googleb8b1d8177557b5c4.html) */
export const GOOGLE_SITE_VERIFICATION_FILE = "googleb8b1d8177557b5c4.html";
