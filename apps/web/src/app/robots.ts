import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

const DISALLOW_APP = [
  "/dashboard",
  "/onboarding",
  "/signup",
  "/login",
  "/sites/",
  "/job-runs/",
  "/deployments/",
  "/billing",
  "/team",
];

/** Allow major search + AI crawlers on public marketing pages. */
export default function robots(): MetadataRoute.Robots {
  const site = getSiteUrl();
  const publicRule = {
    allow: "/",
    disallow: DISALLOW_APP,
  } as const;

  return {
    rules: [
      { userAgent: "*", ...publicRule },
      { userAgent: "Googlebot", ...publicRule },
      { userAgent: "Google-Extended", ...publicRule },
      { userAgent: "GPTBot", ...publicRule },
      { userAgent: "ChatGPT-User", ...publicRule },
      { userAgent: "ClaudeBot", ...publicRule },
      { userAgent: "PerplexityBot", ...publicRule },
      { userAgent: "Applebot-Extended", ...publicRule },
    ],
    sitemap: `${site}/sitemap.xml`,
    host: site.replace(/^https?:\/\//, ""),
  };
}
