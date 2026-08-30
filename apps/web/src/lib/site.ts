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

/** Primary brand for search + metadata */
export const BRAND_NAME = "grothos";
/** Product codename shown in-app */
export const PRODUCT_NAME = "AI-Growth-OS";
/** SEO site name (brand first) */
export const SITE_NAME = BRAND_NAME;
export const SITE_DISPLAY = `${BRAND_NAME} · ${PRODUCT_NAME}`;
export const SITE_TAGLINE =
  "grothos is your AI-powered SEO, AEO & GEO growth engine — connect any site, scan issues, approve safe fixes, deploy with verify & rollback.";
export const SITE_KEYWORDS = [
  "grothos",
  "AI-Growth-OS",
  "growthOS",
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
