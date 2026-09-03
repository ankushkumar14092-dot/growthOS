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
export const BRAND_NAME = "GrowthOS";
/** Optional alternate strings (avoid “grothos” to keep entity clarity). */
export const BRAND_ALIASES = ["GrowthOS"] as const;
/** @deprecated Use BRAND_NAME */
export const SEARCH_DISPLAY_NAME = BRAND_NAME;
/** Product codename / legacy name */
export const PRODUCT_NAME = "AI-Growth-OS";
export const SITE_NAME = BRAND_NAME;
export const SITE_DISPLAY = BRAND_NAME;
export const SITE_TAGLINE =
  "GrowthOS is an AI-powered SEO, AEO and GEO growth engine. Connect your website, scan issues, approve safe fixes, and deploy with verification and rollback.";
export const SITE_KEYWORDS = [
  "GrowthOS",
  "AI SEO",
  "AI-powered SEO",
  "SEO automation",
  "technical SEO",
  "AEO",
  "Answer Engine Optimization",
  "GEO",
  "Generative Engine Optimization",
  "AI visibility",
  "AI search optimization",
  "SEO audit",
  "SEO verification",
  "SEO rollback",
  "WordPress SEO",
  "LLM visibility",
  "website SEO auditing",
];

export const GITHUB_URL =
  "https://github.com/ankushkumar14092-dot/growthOS";

/** Google Search Console HTML-file verification (also served at /googleb8b1d8177557b5c4.html) */
export const GOOGLE_SITE_VERIFICATION_FILE = "googleb8b1d8177557b5c4.html";
