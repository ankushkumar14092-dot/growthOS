import {
  BRAND_NAME,
  GITHUB_URL,
  PRODUCT_NAME,
  SITE_TAGLINE,
  getSiteUrl,
} from "@/lib/site";

function logoUrl() {
  return `${getSiteUrl()}/logo.png`;
}

export function organizationJsonLd() {
  const site = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND_NAME,
    alternateName: [PRODUCT_NAME, "AI Growth OS", "growthos"],
    url: site,
    logo: logoUrl(),
    image: logoUrl(),
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
    alternateName: [PRODUCT_NAME, "growthos"],
    url: site,
    description: SITE_TAGLINE,
    inLanguage: "en",
    publisher: {
      "@type": "Organization",
      name: BRAND_NAME,
      url: site,
      logo: logoUrl(),
    },
  };
}

export function softwareApplicationJsonLd() {
  const site = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: BRAND_NAME,
    alternateName: [PRODUCT_NAME, "growthos"],
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: site,
    image: logoUrl(),
    description: SITE_TAGLINE,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
      description: "Free beta plan with paid Starter and Agency tiers",
    },
  };
}
