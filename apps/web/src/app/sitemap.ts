import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const site = getSiteUrl();
  const lastModified = new Date();
  return [
    { url: `${site}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    {
      url: `${site}/seo-aeo-geo`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${site}/ai-visibility`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${site}/compare`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${site}/pricing`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
