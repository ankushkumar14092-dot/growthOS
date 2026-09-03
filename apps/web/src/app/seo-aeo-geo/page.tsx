import type { Metadata } from "next";
import { MarketingShell } from "@/components/landing/MarketingShell";
import { BrandText } from "@/components/BrandText";
import { BRAND_NAME, getSiteUrl } from "@/lib/site";

const site = getSiteUrl();

export const metadata: Metadata = {
  title: `SEO vs AEO vs GEO — ${BRAND_NAME}`,
  description:
    "SEO, AEO, and GEO explained: classic search, answer engines, and AI visibility. How growthOS scans and ships safe title, meta, and FAQ schema fixes.",
  keywords: [
    "SEO",
    "AEO",
    "GEO",
    "AI visibility",
    "answer engine optimization",
    "generative engine optimization",
    BRAND_NAME,
  ],
  alternates: { canonical: "/seo-aeo-geo" },
  openGraph: {
    title: `SEO vs AEO vs GEO | ${BRAND_NAME}`,
    description:
      "Understand SEO, AEO, and GEO — and how growthOS helps you ship safe, verified fixes.",
    url: `${site}/seo-aeo-geo`,
    type: "article",
  },
};

const PILLARS = [
  {
    title: "SEO",
    subtitle: "Search Engine Optimization",
    body: "Classic Google/Bing visibility: titles, descriptions, crawlability, internal links, and technical hygiene so pages can rank and convert.",
  },
  {
    title: "AEO",
    subtitle: "Answer Engine Optimization",
    body: "Make answers extractable: clear Q&A, FAQ schema, and concise copy so answer boxes and assistants can surface your content accurately.",
  },
  {
    title: "GEO",
    subtitle: "Generative / AI visibility",
    body: "Help AI systems understand and cite you: structured data, llms.txt, consistent entity naming, and clean page structure for generative engines.",
  },
] as const;

export default function SeoAeoGeoPage() {
  const faq = [
    {
      q: "Do I need separate tools for SEO, AEO, and GEO?",
      a: `${BRAND_NAME} treats them as one growth loop: scan issues across pillars, approve proposals, then deploy with verify and rollback where supported.`,
    },
    {
      q: "What does growthOS change first?",
      a: "Beta focuses on high-ROI, low-risk changes: meta title, meta description, FAQ schema, and canonical URLs — with human approval before write.",
    },
  ];

  return (
    <MarketingShell path="/seo-aeo-geo">
      <section className="land-section" style={{ paddingTop: 48 }}>
        <p className="land-kicker">Growth pillars</p>
        <h1 className="land-h2">SEO vs AEO vs GEO</h1>
        <p className="land-lead">
          Search is no longer one channel. <BrandText /> is built for SEO, answer
          engines (AEO), and AI visibility (GEO) in one approve-before-write loop.
        </p>

        <div className="land-flow" style={{ marginTop: 40 }}>
          {PILLARS.map((p, i) => (
            <div key={p.title} className="land-flow-item">
              <div className="land-flow-num">{`0${i + 1}`}</div>
              <div>
                <strong>
                  {p.title} — {p.subtitle}
                </strong>
                <span>{p.body}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="land-section">
        <p className="land-kicker">How growthOS helps</p>
        <h2 className="land-h2">Scan → propose → approve → verify</h2>
        <p className="land-lead">
          Deterministic issues become proposals you can review. WordPress can
          deploy live with backup, HTML verification, and automatic rollback.
          GitHub opens a PR; ZIP packs a fix pack; Live URL exports an apply guide.
        </p>
        <div className="land-cta-row" style={{ marginTop: 32 }}>
          <a className="land-btn-primary" href="/signup">
            <span>Create account</span>
          </a>
          <a className="land-btn-ghost" href="/pricing">
            See pricing
          </a>
        </div>
      </section>

      <section className="land-section land-faq">
        <p className="land-kicker">FAQ</p>
        <h2 className="land-h2">Quick answers</h2>
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
