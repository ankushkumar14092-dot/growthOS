import {
  BRAND_ALIASES,
  BRAND_NAME,
  GITHUB_URL,
  PRODUCT_NAME,
  SITE_TAGLINE,
  getSiteUrl,
} from "@/lib/site";

/** Square mark for Google favicon / Organization logo (must be ≥112×112). */
function brandLogo() {
  const site = getSiteUrl();
  return {
    "@type": "ImageObject" as const,
    url: `${site}/icon-512.png`,
    contentUrl: `${site}/icon-512.png`,
    width: 512,
    height: 512,
    caption: BRAND_NAME,
  };
}

const ALTERNATE_NAMES = [...BRAND_ALIASES, PRODUCT_NAME];

export function organizationJsonLd() {
  const site = getSiteUrl();
  const logo = brandLogo();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${site}/#organization`,
    name: BRAND_NAME,
    legalName: BRAND_NAME,
    alternateName: ALTERNATE_NAMES,
    url: site,
    logo,
    image: logo,
    description: SITE_TAGLINE,
    knowsAbout: [
      "SEO",
      "AEO",
      "GEO",
      "AI visibility",
      "LLM visibility",
      "answer engine optimization",
      "generative engine optimization",
      "WordPress SEO",
    ],
    areaServed: {
      "@type": "Country",
      name: "India",
    },
    availableLanguage: ["en", "en-IN"],
    sameAs: [GITHUB_URL],
  };
}

export function websiteJsonLd() {
  const site = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${site}/#website`,
    name: BRAND_NAME,
    alternateName: ALTERNATE_NAMES,
    url: site,
    description: SITE_TAGLINE,
    inLanguage: "en-IN",
    publisher: { "@id": `${site}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${site}/seo-aeo-geo?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function softwareApplicationJsonLd() {
  const site = getSiteUrl();
  const logo = brandLogo();
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${site}/#software`,
    name: BRAND_NAME,
    alternateName: ALTERNATE_NAMES,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "SEO",
    operatingSystem: "Web",
    browserRequirements: "Requires JavaScript. Requires HTML5.",
    url: site,
    image: logo.url,
    screenshot: logo.url,
    description: SITE_TAGLINE,
    featureList: [
      "SEO scan and safe fixes",
      "AEO / answer engine optimization",
      "GEO / AI visibility",
      "Approve before write",
      "Live HTML verify and rollback",
    ],
    keywords:
      "GrowthOS, AI SEO, SEO automation, technical SEO, AEO, GEO, AI visibility, SEO verification, SEO rollback, WordPress SEO",
    author: { "@id": `${site}/#organization` },
    publisher: { "@id": `${site}/#organization` },
  };
}
