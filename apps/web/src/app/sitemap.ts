import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const site = getSiteUrl();
  const lastModified = new Date();
  return [
    { url: `${site}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${site}/login`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${site}/signup`, lastModified, changeFrequency: "monthly", priority: 0.7 },
  ];
}
