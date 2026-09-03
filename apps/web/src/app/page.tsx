import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";
import { BRAND_NAME, getSiteUrl, SITE_KEYWORDS, SITE_TAGLINE } from "@/lib/site";

const site = getSiteUrl();

const homepageTitle = `${BRAND_NAME} — AI SEO, AEO & GEO Growth Engine`;
const homepageUrl = `${site}/`;

const homepageWebPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": `${site}/#webpage`,
  url: homepageUrl,
  name: homepageTitle,
  isPartOf: { "@id": `${site}/#website` },
  about: { "@id": `${site}/#software` },
};

export const metadata: Metadata = {
  title: `${BRAND_NAME} — AI SEO, AEO & GEO Growth Engine`,
  description: SITE_TAGLINE,
  keywords: SITE_KEYWORDS,
  alternates: { canonical: "/" },
  openGraph: {
    title: `${BRAND_NAME} — AI SEO, AEO & GEO Growth Engine`,
    description: SITE_TAGLINE,
    url: `${site}/`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND_NAME} — AI SEO, AEO & GEO Growth Engine`,
    description: SITE_TAGLINE,
    images: ["/opengraph-image?v=logo-hero"],
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

  return (
    <>
      <LandingPage betaNotice={betaNotice} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(homepageWebPageJsonLd),
        }}
      />
    </>
  );
}
