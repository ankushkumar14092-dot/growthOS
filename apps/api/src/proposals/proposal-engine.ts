import {
  ChangeClass,
  ImpactType,
  ProposalType,
  PROMPT_VERSION,
} from "@ai-growth-os/shared";

export type DraftProposal = {
  proposalType: ProposalType;
  beforeValue: string;
  afterValue: string;
  businessImpact: string;
  impactType: ImpactType;
  reasoning: string;
  confidence: number;
  changeClass: ChangeClass;
  source: "rule" | "llm";
  model: string | null;
  promptVersion: string;
};

/** Server-side trust score — never trust model self-scores. */
export function confidenceFor(opts: {
  proposalType: ProposalType;
  source: "rule" | "llm";
  beforeEmpty: boolean;
}): number {
  if (opts.proposalType === "canonical" || opts.proposalType === "open_graph") {
    return opts.beforeEmpty ? 96 : 90;
  }
  if (
    opts.proposalType === "llms_txt" ||
    opts.proposalType === "robots_txt" ||
    opts.proposalType === "sitemap_xml"
  ) {
    return 92;
  }
  if (opts.proposalType === "meta_title" || opts.proposalType === "meta_description") {
    if (opts.beforeEmpty && opts.source === "rule") return 100;
    if (opts.beforeEmpty && opts.source === "llm") return 94;
    if (opts.source === "rule") return 98;
    return 82;
  }
  // faq_schema
  if (opts.source === "rule") return 88;
  return 70;
}

export function changeClassFor(opts: {
  proposalType: ProposalType;
  beforeEmpty: boolean;
}): ChangeClass {
  if (opts.proposalType === "faq_schema") return "approve";
  if (
    opts.proposalType === "llms_txt" ||
    opts.proposalType === "robots_txt" ||
    opts.proposalType === "sitemap_xml"
  ) {
    return "approve";
  }
  if (opts.proposalType === "canonical" || opts.proposalType === "open_graph") {
    return "safe";
  }
  if (opts.beforeEmpty) return "safe";
  return "approve";
}

export function ruleMetaTitle(domain: string, pageUrl: string): string {
  const host = domain.includes("/") ? domain.split("/")[0] : domain;
  const path = (() => {
    try {
      const u = new URL(pageUrl.includes("://") ? pageUrl : `https://${pageUrl}`);
      const p = u.pathname.replace(/\/$/, "");
      if (!p || p === "/") return "";
      return p
        .split("/")
        .filter(Boolean)
        .slice(-1)[0]
        ?.replace(/[-_]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    } catch {
      return "";
    }
  })();
  const base = host.replace(/^www\./, "");
  const title = path ? `${path} | ${base}` : `${base} — grow with AI-ready SEO`;
  return title.slice(0, 60);
}

export function ruleMetaDescription(domain: string): string {
  const host = domain.replace(/^www\./, "").split("/")[0];
  return `Discover ${host}: improve SEO, AI visibility, and on-page performance with clear, trusted website improvements.`
    .slice(0, 155);
}

export function ruleFaqSchema(domain: string): string {
  const host = domain.replace(/^www\./, "").split("/")[0];
  return JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: `What is ${host}?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: `${host} helps visitors find clear information about products and services.`,
          },
        },
        {
          "@type": "Question",
          name: `How can I contact ${host}?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: `Visit ${host} and use the contact options listed on the site.`,
          },
        },
      ],
    },
    null,
    2,
  );
}

/** Preferred self-referencing canonical for a page URL. */
export function ruleCanonical(pageUrl: string, domain: string): string {
  try {
    const raw = pageUrl.includes("://") ? pageUrl : `https://${pageUrl}`;
    const u = new URL(raw);
    const host = domain.replace(/^www\./, "").split("/")[0] || u.hostname;
    u.protocol = "https:";
    u.hostname = host;
    u.hash = "";
    // Prefer no trailing slash except root
    if (u.pathname.length > 1 && u.pathname.endsWith("/")) {
      u.pathname = u.pathname.replace(/\/+$/, "");
    }
    return u.toString();
  } catch {
    return `https://${domain.replace(/^www\./, "")}/`;
  }
}

export function ruleOpenGraph(domain: string, pageUrl: string, titleHint?: string): string {
  const host = domain.replace(/^www\./, "").split("/")[0];
  const title = (titleHint?.trim() || ruleMetaTitle(domain, pageUrl)).slice(0, 70);
  const description = ruleMetaDescription(domain);
  const url = ruleCanonical(pageUrl, domain);
  return [
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${host}" />`,
    `<meta property="og:title" content="${title.replace(/"/g, "")}" />`,
    `<meta property="og:description" content="${description.replace(/"/g, "")}" />`,
    `<meta property="og:url" content="${url}" />`,
  ].join("\n");
}

export function ruleLlmsTxt(domain: string): string {
  const host = domain.replace(/^www\./, "").split("/")[0];
  return [
    `# ${host}`,
    "",
    `> ${host} — product and service information for people and AI systems.`,
    "",
    "## Preferred pages",
    `- Homepage: https://${host}/`,
    `- About: https://${host}/about`,
    `- Contact: https://${host}/contact`,
    "",
    "## Optional",
    `- Sitemap: https://${host}/sitemap.xml`,
  ].join("\n");
}

export function ruleRobotsTxt(domain: string): string {
  const host = domain.replace(/^www\./, "").split("/")[0];
  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /wp-admin/",
    "Disallow: /wp-login.php",
    "",
    `Sitemap: https://${host}/sitemap.xml`,
    "",
  ].join("\n");
}

export function ruleSitemapXml(domain: string): string {
  const host = domain.replace(/^www\./, "").split("/")[0];
  const today = new Date().toISOString().slice(0, 10);
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://${host}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;
}

export function impactFor(type: ProposalType): {
  impactType: ImpactType;
  businessImpact: string;
} {
  if (type === "meta_title") {
    return {
      impactType: "CTR",
      businessImpact:
        "Clear titles improve click-through from search results and help users understand the page instantly.",
    };
  }
  if (type === "meta_description") {
    return {
      impactType: "CTR",
      businessImpact:
        "A missing description reduces how compelling your listing looks in Google — fixing it can lift clicks.",
    };
  }
  if (type === "canonical") {
    return {
      impactType: "SEO",
      businessImpact:
        "A canonical tag consolidates ranking signals on the preferred URL and reduces duplicate-content confusion.",
    };
  }
  if (type === "open_graph") {
    return {
      impactType: "AI_Visibility",
      businessImpact:
        "Open Graph tags make shares and AI link previews show a clear title and description for your brand.",
    };
  }
  if (type === "llms_txt") {
    return {
      impactType: "AI_Visibility",
      businessImpact:
        "llms.txt helps generative engines understand what your site is about and which pages matter.",
    };
  }
  if (type === "robots_txt") {
    return {
      impactType: "Technical",
      businessImpact:
        "A robots.txt file guides crawlers and can point them at your sitemap for better discovery.",
    };
  }
  if (type === "sitemap_xml") {
    return {
      impactType: "SEO",
      businessImpact:
        "An XML sitemap helps search engines discover and recrawl your important URLs.",
    };
  }
  return {
    impactType: "AI_Visibility",
    businessImpact:
      "FAQ schema helps search and answer engines surface structured Q&A from your page.",
  };
}

export function buildRuleProposal(opts: {
  proposalType: ProposalType;
  beforeValue: string;
  domain: string;
  pageUrl: string;
}): DraftProposal {
  const beforeEmpty = !opts.beforeValue.trim();
  let afterValue = "";
  let reasoning = "";

  if (opts.proposalType === "meta_title") {
    afterValue = ruleMetaTitle(opts.domain, opts.pageUrl);
    reasoning = beforeEmpty
      ? "Page has no title tag. A concise branded title helps searchers and crawlers identify the page."
      : "Title exists but a clearer branded variant is suggested for review.";
  } else if (opts.proposalType === "meta_description") {
    afterValue = ruleMetaDescription(opts.domain);
    reasoning = beforeEmpty
      ? "Page has no meta description. A short summary can improve snippet quality and CTR."
      : "Description exists; suggested rewrite is available for human review.";
  } else if (opts.proposalType === "canonical") {
    afterValue = ruleCanonical(opts.pageUrl, opts.domain);
    reasoning = beforeEmpty
      ? "Page has no canonical link. A self-referencing canonical tells search engines which URL is authoritative."
      : "Canonical exists; a normalized preferred URL is suggested for review.";
  } else if (opts.proposalType === "open_graph") {
    afterValue = ruleOpenGraph(opts.domain, opts.pageUrl);
    reasoning =
      "Page is missing Open Graph tags. Adding og:title/description/url improves share previews and AI link cards.";
  } else if (opts.proposalType === "llms_txt") {
    afterValue = ruleLlmsTxt(opts.domain);
    reasoning =
      "No llms.txt found. A short site brief helps generative engines understand your brand and key pages.";
  } else if (opts.proposalType === "robots_txt") {
    afterValue = ruleRobotsTxt(opts.domain);
    reasoning =
      "No robots.txt detected. A starter file allows public pages, blocks admin paths, and points to a sitemap.";
  } else if (opts.proposalType === "sitemap_xml") {
    afterValue = ruleSitemapXml(opts.domain);
    reasoning =
      "No XML sitemap detected. A starter homepage sitemap helps crawlers discover your primary URL.";
  } else {
    afterValue = ruleFaqSchema(opts.domain);
    reasoning =
      "No JSON-LD FAQ detected. Adding FAQPage schema makes Q&A explicit for search and AI answer engines.";
  }

  const impact = impactFor(opts.proposalType);
  const source = "rule" as const;
  return {
    proposalType: opts.proposalType,
    beforeValue: opts.beforeValue,
    afterValue,
    businessImpact: impact.businessImpact,
    impactType: impact.impactType,
    reasoning,
    confidence: confidenceFor({
      proposalType: opts.proposalType,
      source,
      beforeEmpty,
    }),
    changeClass: changeClassFor({
      proposalType: opts.proposalType,
      beforeEmpty,
    }),
    source,
    model: null,
    promptVersion: PROMPT_VERSION,
  };
}

export async function maybeLlmPolish(opts: {
  apiKey: string | undefined;
  draft: DraftProposal;
  domain: string;
  pageUrl: string;
}): Promise<DraftProposal> {
  if (!opts.apiKey) return opts.draft;
  if (
    opts.draft.proposalType === "faq_schema" ||
    opts.draft.proposalType === "canonical" ||
    opts.draft.proposalType === "open_graph" ||
    opts.draft.proposalType === "llms_txt" ||
    opts.draft.proposalType === "robots_txt" ||
    opts.draft.proposalType === "sitemap_xml"
  ) {
    return opts.draft;
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              "You write concise SEO meta copy. Return ONLY the suggested string, no quotes or explanation. Max 60 chars for titles, 155 for descriptions.",
          },
          {
            role: "user",
            content: `Domain: ${opts.domain}\nPage: ${opts.pageUrl}\nType: ${opts.draft.proposalType}\nCurrent: ${opts.draft.beforeValue || "(empty)"}\nDraft suggestion: ${opts.draft.afterValue}\nImprove the draft for clarity and trust.`,
          },
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return opts.draft;
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      model?: string;
    };
    const text = json.choices?.[0]?.message?.content?.trim();
    if (!text) return opts.draft;
    const max = opts.draft.proposalType === "meta_title" ? 60 : 155;
    const afterValue = text.replace(/^["']|["']$/g, "").slice(0, max);
    const beforeEmpty = !opts.draft.beforeValue.trim();
    return {
      ...opts.draft,
      afterValue,
      source: "llm",
      model: json.model ?? "gpt-4o-mini",
      confidence: confidenceFor({
        proposalType: opts.draft.proposalType,
        source: "llm",
        beforeEmpty,
      }),
      changeClass: changeClassFor({
        proposalType: opts.draft.proposalType,
        beforeEmpty,
      }),
      reasoning: `${opts.draft.reasoning} Refined with a constrained LLM pass for clarity.`,
    };
  } catch {
    return opts.draft;
  }
}

export function issueToProposalType(issueType: string): ProposalType | null {
  if (issueType === "missing_title") return "meta_title";
  if (issueType === "missing_meta_description") return "meta_description";
  if (issueType === "no_schema") return "faq_schema";
  if (issueType === "missing_canonical") return "canonical";
  if (issueType === "missing_open_graph") return "open_graph";
  if (issueType === "no_llms_txt") return "llms_txt";
  if (issueType === "no_robots") return "robots_txt";
  if (issueType === "no_sitemap") return "sitemap_xml";
  return null;
}
