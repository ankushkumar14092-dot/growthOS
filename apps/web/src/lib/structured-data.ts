import {
  BRAND_NAME,
  GITHUB_URL,
  PRODUCT_NAME,
  SITE_TAGLINE,
  getSiteUrl,
} from "@/lib/site";

export function organizationJsonLd() {
  const site = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND_NAME,
    alternateName: [PRODUCT_NAME, "growthOS", "AI Growth OS"],
    url: site,
    description: SITE_TAGLINE,
    sameAs: [GITHUB_URL],
  };
}

export function websiteJsonLd() {
  const site = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: BRAND_NAME,
    alternateName: PRODUCT_NAME,
    url: site,
    description: SITE_TAGLINE,
    publisher: { "@type": "Organization", name: BRAND_NAME, url: site },
  };
}

export function softwareApplicationJsonLd() {
  const site = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: BRAND_NAME,
    alternateName: PRODUCT_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: site,
    description: SITE_TAGLINE,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
      description: "Free beta plan with paid Starter and Agency tiers",
    },
  };
}
