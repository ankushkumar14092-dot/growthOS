import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { WebSentry } from "@/components/WebSentry";
import {
  organizationJsonLd,
  softwareApplicationJsonLd,
  websiteJsonLd,
} from "@/lib/structured-data";
import {
  BRAND_NAME,
  getSiteUrl,
  SITE_DISPLAY,
  SITE_KEYWORDS,
  SITE_TAGLINE,
} from "@/lib/site";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans-loaded",
  weight: ["400", "600", "700"],
  display: "swap",
  adjustFontFallback: true,
});

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${BRAND_NAME} — AI SEO, AEO & GEO growth engine`,
    template: `%s | ${BRAND_NAME}`,
  },
  description: SITE_TAGLINE,
  keywords: SITE_KEYWORDS,
  applicationName: BRAND_NAME,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: SITE_DISPLAY,
    title: `${BRAND_NAME} — AI-powered SEO, AEO & GEO growth`,
    description: SITE_TAGLINE,
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND_NAME} — AI-powered SEO, AEO & GEO growth`,
    description: SITE_TAGLINE,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google:
      process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ||
      process.env.GOOGLE_SITE_VERIFICATION,
  },
  other: {
    "apple-mobile-web-app-title": BRAND_NAME,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={sans.variable}
      // Browser extensions often inject attrs (e.g. crxlauncher) onto <html>
      // before hydration; ignore those mismatches.
      suppressHydrationWarning
    >
      <body
        style={{ fontFamily: "var(--font-sans-loaded), var(--font-sans)" }}
        suppressHydrationWarning
      >
        <WebSentry />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              organizationJsonLd(),
              websiteJsonLd(),
              softwareApplicationJsonLd(),
            ]),
          }}
        />
        {children}
      </body>
    </html>
  );
}
