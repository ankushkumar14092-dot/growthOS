import { PROMPT_VERSION } from "@ai-growth-os/shared";
import {
  changeClassFor,
  confidenceFor,
  ruleCanonical,
  ruleLlmsTxt,
  ruleMetaDescription,
  ruleOpenGraph,
} from "../proposals/proposal-engine";

export type ResearchSnapshot = {
  query: string;
  domain: string;
  keywords: Array<{ phrase: string; source: string }>;
  peopleAlsoAsk: string[];
  suggestions: string[];
};

export type ResearchDraft = {
  issueType: string;
  proposalType: string;
  beforeValue: string;
  afterValue: string;
  businessImpact: string;
  impactType: string;
  reasoning: string;
  confidence: number;
  changeClass: string;
};

/** Build deployable proposal drafts from SERP/Tavily research. */
export function draftsFromResearch(
  research: ResearchSnapshot,
  pageUrl: string,
): ResearchDraft[] {
  const domain = research.domain;
  const kw =
    research.keywords.find((k) => k.source !== "domain")?.phrase ||
    research.keywords[0]?.phrase ||
    domain.split(".")[0] ||
    domain;
  const brand = domain.replace(/^www\./, "");
  const title = `${kw} | ${brand}`.slice(0, 60);
  const description = (
    research.suggestions[0] ||
    `Learn about ${kw} on ${brand}. Clear answers for search and AI assistants.`
  ).slice(0, 155);

  const faqQuestions = (
    research.peopleAlsoAsk.length
      ? research.peopleAlsoAsk
      : [
          `What is ${kw}?`,
          `How does ${brand} help with ${kw}?`,
          `Where can I learn more about ${kw}?`,
        ]
  ).slice(0, 4);

  const faq = JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqQuestions.map((q) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: {
          "@type": "Answer",
          text: `${q.replace(/\?$/, "")} — see https://${brand}/ for details related to ${kw}.`,
        },
      })),
    },
    null,
    2,
  );

  const llmsBase = ruleLlmsTxt(domain);
  const llms = [
    llmsBase,
    "",
    "## Target topics (from research)",
    ...research.keywords.slice(0, 8).map((k) => `- ${k.phrase}`),
    "",
  ].join("\n");

  const og = ruleOpenGraph(domain, pageUrl, title);
  const canonical = ruleCanonical(pageUrl, domain);

  const drafts: ResearchDraft[] = [
    {
      issueType: "missing_title",
      proposalType: "meta_title",
      beforeValue: "",
      afterValue: title,
      businessImpact:
        "Keyword-informed title improves SEO click-through and AEO clarity.",
      impactType: "seo",
      reasoning: `Built from research keyword “${kw}” (query: ${research.query}).`,
      confidence: confidenceFor({
        proposalType: "meta_title",
        source: "rule",
        beforeEmpty: true,
      }),
      changeClass: changeClassFor({
        proposalType: "meta_title",
        beforeEmpty: true,
      }),
    },
    {
      issueType: "missing_meta_description",
      proposalType: "meta_description",
      beforeValue: "",
      afterValue: description || ruleMetaDescription(domain),
      businessImpact: "Meta description carries the research intent into SERP snippets.",
      impactType: "seo",
      reasoning: `Description shaped from research suggestions / keyword “${kw}”.`,
      confidence: confidenceFor({
        proposalType: "meta_description",
        source: "rule",
        beforeEmpty: true,
      }),
      changeClass: changeClassFor({
        proposalType: "meta_description",
        beforeEmpty: true,
      }),
    },
    {
      issueType: "missing_faq_schema",
      proposalType: "faq_schema",
      beforeValue: "",
      afterValue: faq,
      businessImpact: "FAQ schema from People Also Ask helps AEO/GEO answer surfaces.",
      impactType: "aeo",
      reasoning: "FAQ entities derived from SERP People Also Ask / research questions.",
      confidence: confidenceFor({
        proposalType: "faq_schema",
        source: "rule",
        beforeEmpty: true,
      }),
      changeClass: changeClassFor({
        proposalType: "faq_schema",
        beforeEmpty: true,
      }),
    },
    {
      issueType: "missing_open_graph",
      proposalType: "open_graph",
      beforeValue: "",
      afterValue: og,
      businessImpact: "Open Graph tags improve share previews and GEO brand signals.",
      impactType: "geo",
      reasoning: `OG title aligned to research keyword “${kw}”.`,
      confidence: confidenceFor({
        proposalType: "open_graph",
        source: "rule",
        beforeEmpty: true,
      }),
      changeClass: changeClassFor({
        proposalType: "open_graph",
        beforeEmpty: true,
      }),
    },
    {
      issueType: "no_llms_txt",
      proposalType: "llms_txt",
      beforeValue: "",
      afterValue: llms,
      businessImpact: "llms.txt lists research topics for AI crawlers (GEO).",
      impactType: "geo",
      reasoning: "Appended researched keywords as preferred topics for AI agents.",
      confidence: confidenceFor({
        proposalType: "llms_txt",
        source: "rule",
        beforeEmpty: true,
      }),
      changeClass: changeClassFor({
        proposalType: "llms_txt",
        beforeEmpty: true,
      }),
    },
  ];

  // mark prompt version usage via side comment in reasoning already
  void PROMPT_VERSION;
  return drafts;
}
