import { extractFromHtml } from "../scans/html-extract";

export type VerifyInput = {
  proposalType: string;
  afterValue: string;
  html: string;
  pageReachable: boolean;
  /** When true, force mismatch (local rollback testing). */
  forceFail?: boolean;
};

export type VerifyResult = {
  pass: boolean;
  checks: Array<{ name: string; pass: boolean; detail?: string }>;
  observed?: {
    title?: string | null;
    metaDescription?: string | null;
    faqPresent?: boolean;
  };
};

/**
 * Never trust apply alone — verify live HTML against the approved after_state.
 */
export function verifyDeployment(input: VerifyInput): VerifyResult {
  const checks: VerifyResult["checks"] = [];

  checks.push({
    name: "page_reachable",
    pass: input.pageReachable,
    detail: input.pageReachable ? "ok" : "site unreachable",
  });

  if (input.forceFail || process.env.FORCE_VERIFY_FAIL === "1") {
    checks.push({
      name: "forced_fail",
      pass: false,
      detail: "FORCE_VERIFY_FAIL",
    });
    return { pass: false, checks };
  }

  const extracted = extractFromHtml(input.html, "https://verify.local/");
  const expected = input.afterValue.trim();

  if (input.proposalType === "meta_title") {
    const title = (extracted.title ?? "").trim();
    const exists = title.length > 0;
    const matches = normalize(title) === normalize(expected);
    checks.push({
      name: "title_exists",
      pass: exists,
      detail: exists ? title : "missing <title>",
    });
    checks.push({
      name: "title_matches",
      pass: matches,
      detail: matches ? "match" : `expected "${expected}", got "${title}"`,
    });
    return {
      pass: checks.every((c) => c.pass),
      checks,
      observed: { title: extracted.title, metaDescription: extracted.metaDescription },
    };
  }

  if (input.proposalType === "meta_description") {
    const desc = (extracted.metaDescription ?? "").trim();
    const exists = desc.length > 0;
    const matches = normalize(desc) === normalize(expected);
    checks.push({
      name: "meta_description_exists",
      pass: exists,
      detail: exists ? desc : "missing meta description",
    });
    checks.push({
      name: "meta_description_matches",
      pass: matches,
      detail: matches ? "match" : `expected "${expected}", got "${desc}"`,
    });
    return {
      pass: checks.every((c) => c.pass),
      checks,
      observed: { title: extracted.title, metaDescription: extracted.metaDescription },
    };
  }

  if (input.proposalType === "faq_schema") {
    const faqPresent = jsonLdContainsFaq(extracted.jsonLd, expected);
    checks.push({
      name: "faq_schema_present",
      pass: faqPresent,
      detail: faqPresent ? "FAQ JSON-LD found" : "FAQ schema not found in page",
    });
    return {
      pass: checks.every((c) => c.pass),
      checks,
      observed: { faqPresent, title: extracted.title },
    };
  }

  if (input.proposalType === "canonical") {
    const canonical = (extracted.canonical ?? "").trim();
    const exists = canonical.length > 0;
    const matches =
      normalize(canonical) === normalize(expected) ||
      canonical.includes(expected.replace(/\/$/, "")) ||
      expected.includes(canonical.replace(/\/$/, ""));
    checks.push({
      name: "canonical_exists",
      pass: exists,
      detail: exists ? canonical : "missing rel=canonical",
    });
    checks.push({
      name: "canonical_matches",
      pass: matches,
      detail: matches ? "match" : `expected "${expected}", got "${canonical}"`,
    });
    return {
      pass: checks.every((c) => c.pass),
      checks,
      observed: { title: extracted.title, metaDescription: extracted.metaDescription },
    };
  }

  if (input.proposalType === "open_graph") {
    const ogTitle = extracted.og["og:title"] ?? "";
    const hasOg = Boolean(ogTitle) || Boolean(extracted.og["og:description"]);
    const expectedTitle =
      expected.match(/property=["']og:title["'][^>]*content=["']([^"']+)/i)?.[1] ||
      expected.match(/content=["']([^"']+)["'][^>]*property=["']og:title["']/i)?.[1] ||
      "";
    const matches =
      !expectedTitle ||
      normalize(ogTitle) === normalize(expectedTitle) ||
      input.html.includes(expectedTitle);
    checks.push({
      name: "open_graph_present",
      pass: hasOg || input.html.includes("og:title"),
      detail: hasOg ? ogTitle : "missing og tags",
    });
    checks.push({
      name: "open_graph_matches",
      pass: matches,
      detail: matches ? "match" : `expected og:title "${expectedTitle}", got "${ogTitle}"`,
    });
    return {
      pass: checks.every((c) => c.pass),
      checks,
      observed: { title: extracted.title, metaDescription: extracted.metaDescription },
    };
  }

  if (
    input.proposalType === "llms_txt" ||
    input.proposalType === "robots_txt" ||
    input.proposalType === "sitemap_xml"
  ) {
    // File templates are verified by pack/guide content or WP option rewrite body.
    const marker =
      input.proposalType === "llms_txt"
        ? expected.split("\n")[0]?.slice(0, 24) || "#"
        : input.proposalType === "robots_txt"
          ? "User-agent"
          : "<urlset";
    const present =
      input.html.includes(marker) ||
      input.html.includes(expected.slice(0, Math.min(40, expected.length)));
    checks.push({
      name: `${input.proposalType}_content_present`,
      pass: present,
      detail: present
        ? "content found"
        : "Approved file content not found at expected URL yet",
    });
    return {
      pass: checks.every((c) => c.pass),
      checks,
      observed: { title: extracted.title },
    };
  }

  checks.push({
    name: "unsupported_type",
    pass: false,
    detail: input.proposalType,
  });
  return { pass: false, checks };
}

function normalize(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function jsonLdContainsFaq(jsonLd: unknown[], expected: string): boolean {
  const blob = JSON.stringify(jsonLd);
  if (!blob) return false;

  // Prefer structural check
  const hasFaqType = blob.includes("FAQPage") || blob.includes("Question");
  if (!hasFaqType) {
    // Fall back: raw expected string embedded
    return blob.includes(expected.slice(0, Math.min(40, expected.length)));
  }

  try {
    const expectedObj = JSON.parse(expected) as unknown;
    const expectedStr = JSON.stringify(expectedObj);
    // Loose: expected FAQPage marker or question text appears
    if (blob.includes("FAQPage") && expectedStr.includes("FAQPage")) {
      return true;
    }
    if (typeof expectedObj === "object" && expectedObj && "mainEntity" in expectedObj) {
      return blob.includes("mainEntity") || blob.includes("Question");
    }
  } catch {
    // expected may be pretty JSON string already partially present
  }

  return hasFaqType;
}
