import type { Metadata } from "next";
import { getSiteUrl, SITE_NAME, SITE_TAGLINE } from "@/lib/site";

const site = getSiteUrl();

export const metadata: Metadata = {
  title: "Signup",
  description: `Create your ${SITE_NAME} workspace. ${SITE_TAGLINE}`,
  alternates: { canonical: "/signup" },
  openGraph: {
    title: `Signup | ${SITE_NAME}`,
    description: SITE_TAGLINE,
    url: `${site}/signup`,
    siteName: SITE_NAME,
    type: "website",
  },
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
