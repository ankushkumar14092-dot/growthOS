import {
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

export function organizationJsonLd() {
  const site = getSiteUrl();
  const logo = brandLogo();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${site}/#organization`,
    name: BRAND_NAME,
    legalName: BRAND_NAME,
    alternateName: [PRODUCT_NAME, "AI Growth OS", "growthos"],
    url: site,
    logo,
    image: logo,
    description: SITE_TAGLINE,
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
    alternateName: ["growthos", PRODUCT_NAME],
    url: site,
    description: SITE_TAGLINE,
    inLanguage: "en",
    publisher: { "@id": `${site}/#organization` },
  };
}

export function softwareApplicationJsonLd() {
  const site = getSiteUrl();
  const logo = brandLogo();
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: BRAND_NAME,
    alternateName: [PRODUCT_NAME, "growthos"],
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "SEO",
    operatingSystem: "Web",
    browserRequirements: "Requires JavaScript. Requires HTML5.",
    url: site,
    image: logo.url,
    screenshot: logo.url,
    description: SITE_TAGLINE,
    author: { "@id": `${site}/#organization` },
    publisher: { "@id": `${site}/#organization` },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
      url: `${site}/signup`,
      description: "Free beta plan with paid Starter and Agency tiers",
    },
  };
}
