import type { Metadata } from "next";
import { MarketingShell } from "@/components/landing/MarketingShell";
import { BrandText } from "@/components/BrandText";
import { BRAND_NAME, getSiteUrl, SITE_KEYWORDS } from "@/lib/site";

const site = getSiteUrl();

export const metadata: Metadata = {
  title: `AI visibility tool (GEO) for India — ${BRAND_NAME}`,
  description:
    "AI visibility / GEO for Indian teams: GrowthOS (grothos.in) scans SEO · AEO · GEO issues, proposes safe fixes, and deploys only after you approve — with verification and rollback.",
  keywords: [
    ...SITE_KEYWORDS,
    "AI visibility India",
    "GEO tool India",
    "generative engine optimization India",
    "ChatGPT visibility",
    "LLM visibility",
  ],
  alternates: { canonical: "/ai-visibility" },
  openGraph: {
    title: `AI visibility & GEO | ${BRAND_NAME}`,
    description:
      "Improve how AI systems find, understand, and cite your site — with human approval before every write.",
    url: `${site}/ai-visibility`,
    type: "article",
    locale: "en_IN",
  },
};

const CHECKLIST = [
  {
    title: "Clear answers AI can quote",
    body: "FAQ schema, concise Q&A, and titles that match how people ask in search and chat.",
  },
  {
    title: "Machine-readable structure",
    body: "Canonicals, Open Graph, llms.txt, robots, and sitemap drafts so crawlers and LLMs see a clean map of your site.",
  },
  {
    title: "Safe apply — not blind AI writes",
    body: "Approve → backup → write → verify live HTML → auto-rollback if verify fails (WordPress). GitHub opens a PR.",
  },
] as const;

export default function AiVisibilityPage() {
  const faq = [
    {
      q: "What is AI visibility?",
      a: "AI visibility (also called GEO — generative engine optimization) is how easily AI systems and answer engines can understand, summarize, and cite your website.",
    },
    {
      q: "Is GrowthOS an AI visibility tool for India?",
      a: `${BRAND_NAME} (grothos.in) is built for Indian and global teams who want SEO, AEO, and GEO in one loop — priced in INR, with Free / Starter / Agency plans.`,
    },
    {
      q: "How is AI visibility different from classic SEO?",
      a: `SEO targets Google rankings. AI visibility / GEO targets how ChatGPT-style systems and answer engines represent you. ${BRAND_NAME} covers both plus AEO in one approve-before-write workflow.`,
    },
    {
      q: "Can I search GrowthOS or AI visibility and find you?",
      a: "Yes — GrowthOS brand searches (including grothos.in) and topic pages like /ai-visibility and /seo-aeo-geo are meant to be the first useful result for those queries.",
    },
  ];

  return (
    <MarketingShell path="/ai-visibility">
      <section className="land-section" style={{ paddingTop: 48 }}>
        <p className="land-kicker">GEO · LLM visibility</p>
        <h1 className="land-h2">AI visibility tool for modern search</h1>
        <p className="land-lead">
          When people ask ChatGPT, Gemini, or Google AI about your brand — or search{" "}
          <strong>AI visibility</strong>, <strong>GEO</strong>, <strong>{BRAND_NAME}</strong>, or{" "}
          <strong>grothos.in</strong> — you want a clear, citable answer.{" "}
          <BrandText /> helps you ship the on-site fixes that make that possible.
        </p>
      </section>

      <section className="land-section">
        <p className="land-kicker">What we optimize</p>
        <h2 className="land-h2">Built for India · priced in ₹</h2>
        <p className="land-lead">
          Agencies and founders in India use <BrandText /> to improve SEO, AEO, and
          AI visibility without unsupervised writes. Free plan to start; Starter and
          Agency when you need more sites and scans.
        </p>
        <div className="land-flow" style={{ marginTop: 40 }}>
          {CHECKLIST.map((item, i) => (
            <div key={item.title} className="land-flow-item">
              <div className="land-flow-num">{`0${i + 1}`}</div>
              <div>
                <strong>{item.title}</strong>
                <span>{item.body}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="land-cta-row" style={{ marginTop: 32 }}>
          <a className="land-btn-primary" href="/signup">
            <span>Start free</span>
          </a>
          <a className="land-btn-ghost" href="/seo-aeo-geo">
            SEO vs AEO vs GEO
          </a>
        </div>
      </section>

      <section className="land-section land-faq">
        <p className="land-kicker">FAQ</p>
        <h2 className="land-h2">AI visibility questions</h2>
        <div style={{ marginTop: 32 }}>
          {faq.map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: faq.map((item) => ({
                "@type": "Question",
                name: item.q,
                acceptedAnswer: { "@type": "Answer", text: item.a },
              })),
            }),
          }}
        />
      </section>
    </MarketingShell>
  );
}
