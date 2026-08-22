import type { Metadata } from "next";
import { Plus_Jakarta_Sans, IBM_Plex_Mono } from "next/font/google";
import { WebSentry } from "@/components/WebSentry";
import { getSiteUrl, SITE_NAME, SITE_TAGLINE } from "@/lib/site";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans-loaded",
  weight: ["400", "500", "600", "700"],
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono-loaded",
  weight: ["400", "500"],
});

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${SITE_NAME} — AI-ready SEO growth`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_TAGLINE,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — grow with AI-ready SEO`,
    description: SITE_TAGLINE,
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — grow with AI-ready SEO`,
    description: SITE_TAGLINE,
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google:
      process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ||
      process.env.GOOGLE_SITE_VERIFICATION,
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
      className={`${sans.variable} ${mono.variable}`}
      // Browser extensions often inject attrs (e.g. crxlauncher) onto <html>
      // before hydration; ignore those mismatches.
      suppressHydrationWarning
    >
      <body
        style={{ fontFamily: "var(--font-sans-loaded), var(--font-sans)" }}
        suppressHydrationWarning
      >
        <WebSentry />
        {children}
      </body>
    </html>
  );
}
