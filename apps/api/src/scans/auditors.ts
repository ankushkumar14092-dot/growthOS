import { IssueSeverity, IssueType } from "@ai-growth-os/shared";
import { PageExtracted } from "./html-extract";

export type FoundIssue = {
  issueType: IssueType;
  severity: IssueSeverity;
  pageUrl?: string;
  evidence: Record<string, unknown>;
};

export function auditPage(
  url: string,
  extracted: PageExtracted,
  httpStatus: number | null,
): FoundIssue[] {
  const issues: FoundIssue[] = [];
  if (httpStatus && httpStatus >= 400) return issues;

  if (!extracted.title?.trim()) {
    issues.push({
      issueType: "missing_title",
      severity: "high",
      pageUrl: url,
      evidence: { url },
    });
  }
  if (!extracted.metaDescription?.trim()) {
    issues.push({
      issueType: "missing_meta_description",
      severity: "medium",
      pageUrl: url,
      evidence: { url },
    });
  }
  if (extracted.h1.length === 0) {
    issues.push({
      issueType: "missing_h1",
      severity: "medium",
      pageUrl: url,
      evidence: { url },
    });
  } else if (extracted.h1.length > 1) {
    issues.push({
      issueType: "multiple_h1",
      severity: "low",
      pageUrl: url,
      evidence: { url, count: extracted.h1.length },
    });
  }
  if (!extracted.canonical) {
    issues.push({
      issueType: "missing_canonical",
      severity: "low",
      pageUrl: url,
      evidence: { url },
    });
  }
  const missingAlt = extracted.images.filter((i) => i.alt === null || i.alt === "");
  if (missingAlt.length > 0) {
    issues.push({
      issueType: "missing_alt",
      severity: "medium",
      pageUrl: url,
      evidence: { url, count: missingAlt.length },
    });
  }
  if (extracted.jsonLd.length === 0) {
    issues.push({
      issueType: "no_schema",
      severity: "low",
      pageUrl: url,
      evidence: { url },
    });
  }
  if (extracted.textLength > 0 && extracted.textLength < 200) {
    issues.push({
      issueType: "thin_content",
      severity: "low",
      pageUrl: url,
      evidence: { url, textLength: extracted.textLength },
    });
  }

  if (extracted.hasViewport === false) {
    issues.push({
      issueType: "missing_viewport",
      severity: "high",
      pageUrl: url,
      evidence: { url },
    });
  }

  const ogTitle = extracted.og["og:title"] || extracted.og["og:description"];
  if (!ogTitle) {
    issues.push({
      issueType: "missing_open_graph",
      severity: "low",
      pageUrl: url,
      evidence: { url, keys: Object.keys(extracted.og) },
    });
  }

  const internalLinks = extracted.links.filter((l) => l.internal).length;
  if (internalLinks < 2) {
    issues.push({
      issueType: "weak_internal_links",
      severity: "low",
      pageUrl: url,
      evidence: { url, internalLinks },
    });
  }

  if (
    extracted.source === "http" &&
    typeof extracted.ttfbMs === "number" &&
    extracted.ttfbMs > 1500
  ) {
    issues.push({
      issueType: "slow_ttfb",
      severity: extracted.ttfbMs > 3000 ? "high" : "medium",
      pageUrl: url,
      evidence: { url, ttfbMs: extracted.ttfbMs },
    });
  }

  try {
    const u = new URL(url);
    if (u.protocol === "https:") {
      const mixed = extracted.images.some((i) => i.src.startsWith("http://"));
      if (mixed) {
        issues.push({
          issueType: "mixed_content",
          severity: "medium",
          pageUrl: url,
          evidence: { url },
        });
      }
    }
  } catch {
    /* ignore */
  }

  const headers = extracted.headers ?? {};
  const missingHeaders = ["strict-transport-security", "x-frame-options", "content-security-policy"].filter(
    (h) => !Object.keys(headers).some((k) => k.toLowerCase() === h),
  );
  if (extracted.source === "http" && missingHeaders.length === 3) {
    issues.push({
      issueType: "missing_security_headers",
      severity: "info",
      pageUrl: url,
      evidence: { url, missing: missingHeaders },
    });
  }

  return issues;
}

export function auditSiteLevel(opts: {
  seedUrl: string;
  hasRobots: boolean;
  hasSitemap: boolean;
  hasLlmsTxt: boolean;
}): FoundIssue[] {
  const issues: FoundIssue[] = [];
  try {
    if (new URL(opts.seedUrl).protocol === "http:") {
      issues.push({
        issueType: "https_required",
        severity: "high",
        evidence: { url: opts.seedUrl },
      });
    }
  } catch {
    /* ignore */
  }
  if (!opts.hasRobots) {
    issues.push({
      issueType: "no_robots",
      severity: "medium",
      evidence: {},
    });
  }
  if (!opts.hasSitemap) {
    issues.push({
      issueType: "no_sitemap",
      severity: "medium",
      evidence: {},
    });
  }
  if (!opts.hasLlmsTxt) {
    issues.push({
      issueType: "no_llms_txt",
      severity: "info",
      evidence: {},
    });
  }
  return issues;
}
