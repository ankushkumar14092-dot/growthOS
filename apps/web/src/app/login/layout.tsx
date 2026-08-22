import type { Metadata } from "next";
import { getSiteUrl, SITE_NAME, SITE_TAGLINE } from "@/lib/site";

const site = getSiteUrl();

export const metadata: Metadata = {
  title: "Login",
  description: `Sign in to ${SITE_NAME}. ${SITE_TAGLINE}`,
  alternates: { canonical: "/login" },
  openGraph: {
    title: `Login | ${SITE_NAME}`,
    description: SITE_TAGLINE,
    url: `${site}/login`,
    siteName: SITE_NAME,
    type: "website",
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
