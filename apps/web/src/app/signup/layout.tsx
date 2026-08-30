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

const FAQ = [
  {
    q: "What is grothos?",
    a: "grothos (AI-Growth-OS) is an AI growth engine for websites: connect a site, scan SEO/AEO/GEO issues, approve proposals, then deploy and verify.",
  },
  {
    q: "Does the Vercel app use AI?",
    a: "Optional LLM polish is available with an OpenAI key. Scans and many proposals work without it using rules-based engines.",
  },
  {
    q: "Is signup free?",
    a: "Yes — start on the Free plan, then upgrade to Starter or Agency via Razorpay when you need higher limits.",
  },
];

export default function SignupLayout({
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
