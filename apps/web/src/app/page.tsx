import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";
import { BRAND_NAME, getSiteUrl, SITE_KEYWORDS, SITE_TAGLINE } from "@/lib/site";

const site = getSiteUrl();

export const metadata: Metadata = {
  title: `${BRAND_NAME} — AI SEO, AEO & GEO growth engine`,
  description: SITE_TAGLINE,
  keywords: SITE_KEYWORDS,
  alternates: { canonical: "/" },
  openGraph: {
    title: `${BRAND_NAME} — AI-powered SEO, AEO & GEO growth`,
    description: SITE_TAGLINE,
    url: site,
    type: "website",
  },
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ beta?: string }>;
}) {
  const params = await searchParams;
  const betaNotice =
    params.beta === "ok" ? "ok" : params.beta === "error" ? "error" : null;

  return <LandingPage betaNotice={betaNotice} />;
}
