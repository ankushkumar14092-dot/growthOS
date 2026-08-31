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

const FAQ = [
  {
    q: "What is growthOS?",
    a: "growthOS helps teams improve SEO, AEO, and GEO (AI-visibility) by scanning a site, proposing safe fixes, and deploying with verify and rollback where supported.",
  },
  {
    q: "Does the Vercel app use AI?",
    a: "Yes for optional copy polish when an OpenAI key is set. Core proposals also work with deterministic rules without an LLM key.",
  },
  {
    q: "How do I sign in?",
    a: "Use the email and password from signup. After login you land in Mission Control to connect sites and run scans.",
  },
];

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQ.map((item) => ({
              "@type": "Question",
              name: item.q,
              acceptedAnswer: { "@type": "Answer", text: item.a },
            })),
          }),
        }}
      />
    </>
  );
}
