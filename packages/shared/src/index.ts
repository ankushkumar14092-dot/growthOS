export type ChangeClass = "safe" | "approve" | "blocked";

export type PatchTargetType = "post_meta" | "option" | "post_field" | "file";

export type PatchTarget = {
  type: PatchTargetType;
  post_id?: number;
  key?: string;
  path?: string;
};

export type PatchDto = {
  id: string;
  site_id: string;
  proposal_id: string;
  change_class: ChangeClass;
  target: PatchTarget;
  before_state: Record<string, unknown>;
  after_state: Record<string, unknown>;
};

export type JobRunStatus =
  | "queued"
  | "crawling"
  | "auditing"
  | "proposing"
  | "awaiting_approval"
  | "deploying"
  | "verifying"
  | "done"
  | "failed";

export type MembershipRole = "owner" | "member";

export type PlanTier = "free" | "starter" | "agency";

/** MVP connection methods — platform-agnostic connect layer */
export type ConnectionType = "wordpress" | "github" | "zip" | "url_audit";

export type AdapterCapabilities = {
  canAnalyze: boolean;
  canDeploy: boolean;
  canVerify: boolean;
  canRollback: boolean;
};

export const CONNECTION_TYPES: ConnectionType[] = [
  "wordpress",
  "github",
  "zip",
  "url_audit",
];

export type DeployMode =
  | "wordpress_live"
  | "github_pr"
  | "zip_artifact"
  | "url_guide";

export const DEPLOY_MODE_BY_CONNECTION: Record<ConnectionType, DeployMode> = {
  wordpress: "wordpress_live",
  github: "github_pr",
  zip: "zip_artifact",
  url_audit: "url_guide",
};

export const CONNECTION_CAPABILITIES: Record<
  ConnectionType,
  AdapterCapabilities & { label: string; summary: string; deployMode: DeployMode }
> = {
  wordpress: {
    label: "WordPress",
    summary: "Plugin — live write, verify HTML, rollback",
    canAnalyze: true,
    canDeploy: true,
    canVerify: true,
    canRollback: true,
    deployMode: "wordpress_live",
  },
  github: {
    label: "GitHub Repository",
    summary: "Opens a PR with the SEO fix; close PR to roll back",
    canAnalyze: true,
    canDeploy: true,
    canVerify: true,
    canRollback: true,
    deployMode: "github_pr",
  },
  zip: {
    label: "ZIP Upload",
    summary: "Packages a downloadable fix pack (no live host write)",
    canAnalyze: true,
    canDeploy: true,
    canVerify: false,
    canRollback: true,
    deployMode: "zip_artifact",
  },
  url_audit: {
    label: "Live Website URL",
    summary: "Exports apply guide + rechecks live HTML (cannot write remotely)",
    canAnalyze: true,
    canDeploy: true,
    canVerify: true,
    canRollback: true,
    deployMode: "url_guide",
  },
};

export const SAFE_CHANGE_CLASSES: ChangeClass[] = ["safe"];

export const JOB_RUN_STATUSES: JobRunStatus[] = [
  "queued",
  "crawling",
  "auditing",
  "proposing",
  "awaiting_approval",
  "deploying",
  "verifying",
  "done",
  "failed",
];

export function canAutoApply(changeClass: ChangeClass): boolean {
  return changeClass === "safe";
}

export function assertDeployableChangeClass(
  changeClass: ChangeClass,
  autoPath: boolean,
): void {
  if (changeClass === "blocked") {
    throw new Error("forbidden_change_class");
  }
  if (autoPath && changeClass !== "safe") {
    throw new Error("forbidden_change_class");
  }
}

export function getConnectionCapabilities(type: ConnectionType) {
  return CONNECTION_CAPABILITIES[type];
}

export type IssueSeverity = "info" | "low" | "medium" | "high" | "critical";

export type GrowthPillar = "seo" | "aeo" | "geo";

export type IssueType =
  | "missing_title"
  | "missing_meta_description"
  | "missing_h1"
  | "multiple_h1"
  | "missing_alt"
  | "missing_canonical"
  | "no_sitemap"
  | "no_robots"
  | "no_llms_txt"
  | "no_schema"
  | "https_required"
  | "mixed_content"
  | "thin_content"
  | "missing_security_headers"
  | "missing_viewport"
  | "slow_ttfb"
  | "weak_internal_links"
  | "missing_open_graph";

export const ISSUE_TYPES: IssueType[] = [
  "missing_title",
  "missing_meta_description",
  "missing_h1",
  "multiple_h1",
  "missing_alt",
  "missing_canonical",
  "no_sitemap",
  "no_robots",
  "no_llms_txt",
  "no_schema",
  "https_required",
  "mixed_content",
  "thin_content",
  "missing_security_headers",
  "missing_viewport",
  "slow_ttfb",
  "weak_internal_links",
  "missing_open_graph",
];

/** Which growth pillars an issue affects (can be multiple). */
export const ISSUE_PILLARS: Record<IssueType, GrowthPillar[]> = {
  missing_title: ["seo", "aeo", "geo"],
  missing_meta_description: ["seo", "aeo"],
  missing_h1: ["seo", "aeo"],
  multiple_h1: ["seo", "aeo"],
  missing_alt: ["seo"],
  missing_canonical: ["seo"],
  no_sitemap: ["seo"],
  no_robots: ["seo"],
  no_llms_txt: ["geo"],
  no_schema: ["seo", "aeo", "geo"],
  https_required: ["seo", "geo"],
  mixed_content: ["seo"],
  thin_content: ["seo", "aeo", "geo"],
  missing_security_headers: ["seo"],
  missing_viewport: ["seo"],
  slow_ttfb: ["seo"],
  weak_internal_links: ["seo"],
  missing_open_graph: ["geo", "aeo"],
};

export const SCAN_PAGE_CAP = 50;

export type ProposalType =
  | "meta_title"
  | "meta_description"
  | "faq_schema"
  | "canonical"
  | "open_graph"
  | "llms_txt"
  | "robots_txt"
  | "sitemap_xml";

export type ProposalStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected"
  | "superseded";

export type ImpactType =
  | "SEO"
  | "CTR"
  | "Visibility"
  | "AI_Visibility"
  | "Technical"
  | "Performance"
  | "Accessibility";

export const PROPOSAL_TYPES: ProposalType[] = [
  "meta_title",
  "meta_description",
  "faq_schema",
  "canonical",
  "open_graph",
  "llms_txt",
  "robots_txt",
  "sitemap_xml",
];

export const PROPOSAL_STATUSES: ProposalStatus[] = [
  "draft",
  "pending_review",
  "approved",
  "rejected",
  "superseded",
];

export const PROMPT_VERSION = "p4-v2";

/** Phase 5 deployment lifecycle (Mission Timeline) */
export type DeploymentStatus =
  | "ready"
  | "deploying"
  | "verifying"
  | "succeeded"
  | "failed"
  | "rolled_back";

export type DeploymentAction = "apply" | "rollback";

export const DEPLOYMENT_STATUSES: DeploymentStatus[] = [
  "ready",
  "deploying",
  "verifying",
  "succeeded",
  "failed",
  "rolled_back",
];

export const DEPLOYMENT_ACTIONS: DeploymentAction[] = ["apply", "rollback"];

/** Proposal types Phase 5 is allowed to deploy */
export const DEPLOYABLE_PROPOSAL_TYPES: ProposalType[] = [
  "meta_title",
  "meta_description",
  "faq_schema",
  "canonical",
  "open_graph",
  "llms_txt",
  "robots_txt",
  "sitemap_xml",
];

export function isDeployableProposalType(type: string): type is ProposalType {
  return (DEPLOYABLE_PROPOSAL_TYPES as string[]).includes(type);
}

/** Owner-facing copy for scan issues (real-world language). */
export type IssueOwnerGuide = {
  title: string;
  why: string;
  howToFix: string;
  autoFixable: boolean;
  priority: number; // lower = show first
};

export const ISSUE_OWNER_GUIDE: Record<IssueType, IssueOwnerGuide> = {
  missing_title: {
    title: "Page is missing a title",
    why: "Search results and browser tabs need a clear title so people know what the page is about.",
    howToFix: "Add a unique <title> (about 50–60 characters) that names the page and your brand.",
    autoFixable: true,
    priority: 1,
  },
  missing_meta_description: {
    title: "Page is missing a meta description",
    why: "Google often shows this text under your link. Empty descriptions waste clicks.",
    howToFix: "Add a meta description (~120–155 characters) summarizing the page’s value.",
    autoFixable: true,
    priority: 2,
  },
  no_schema: {
    title: "No FAQ / structured data found",
    why: "FAQ schema helps Google and AI answer engines understand Q&A on your page.",
    howToFix: "Add FAQPage JSON-LD for common questions, or approve our suggested FAQ block.",
    autoFixable: true,
    priority: 3,
  },
  missing_canonical: {
    title: "Missing canonical URL",
    why: "Without a canonical tag, search engines may treat www / non-www / trailing-slash variants as duplicates.",
    howToFix: "Add <link rel=\"canonical\" href=\"https://yoursite.com/this-page\"> pointing at the preferred URL.",
    autoFixable: true,
    priority: 4,
  },
  missing_h1: {
    title: "Missing main heading (H1)",
    why: "Visitors and crawlers use the H1 to understand the primary topic of the page.",
    howToFix: "Add one clear H1 that matches the page topic (usually near the top).",
    autoFixable: false,
    priority: 5,
  },
  multiple_h1: {
    title: "Multiple H1 headings",
    why: "Several H1s dilute what the page is mainly about.",
    howToFix: "Keep a single H1; demote extra headings to H2/H3.",
    autoFixable: false,
    priority: 6,
  },
  missing_alt: {
    title: "Images missing alt text",
    why: "Alt text helps accessibility and image search understanding.",
    howToFix: "Add short descriptive alt attributes to important images.",
    autoFixable: false,
    priority: 7,
  },
  no_sitemap: {
    title: "No XML sitemap detected",
    why: "A sitemap helps search engines discover all important URLs.",
    howToFix: "Approve the starter sitemap template, publish /sitemap.xml, and reference it from robots.txt.",
    autoFixable: true,
    priority: 8,
  },
  no_robots: {
    title: "No robots.txt detected",
    why: "robots.txt tells crawlers what they may fetch.",
    howToFix: "Approve the robots.txt template and publish it at /robots.txt (allow public pages; disallow /wp-admin/).",
    autoFixable: true,
    priority: 9,
  },
  no_llms_txt: {
    title: "No llms.txt for AI crawlers",
    why: "llms.txt is an emerging signal that helps AI systems understand your site.",
    howToFix: "Approve the generated /llms.txt draft, then publish it at your site root (or Deploy on WordPress).",
    autoFixable: true,
    priority: 10,
  },
  thin_content: {
    title: "Thin page content",
    why: "Very short pages rarely rank or get cited by AI answers.",
    howToFix: "Expand the page with useful, unique content (not filler) about the topic.",
    autoFixable: false,
    priority: 11,
  },
  https_required: {
    title: "Site is not on HTTPS",
    why: "Browsers and Google expect secure HTTPS.",
    howToFix: "Enable SSL on your host and redirect HTTP → HTTPS.",
    autoFixable: false,
    priority: 1,
  },
  mixed_content: {
    title: "Mixed insecure content",
    why: "HTTP assets on an HTTPS page can trigger browser warnings.",
    howToFix: "Serve images/scripts/styles over HTTPS only.",
    autoFixable: false,
    priority: 5,
  },
  missing_security_headers: {
    title: "Security headers missing",
    why: "Headers like CSP/HSTS harden the site against common attacks.",
    howToFix: "Configure security headers at your CDN/host or WordPress security plugin.",
    autoFixable: false,
    priority: 12,
  },
  missing_viewport: {
    title: "Mobile viewport not set",
    why: "Without a viewport meta tag, mobile Google and users see a broken layout.",
    howToFix: "Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"> in <head>.",
    autoFixable: false,
    priority: 3,
  },
  slow_ttfb: {
    title: "Slow server response (TTFB)",
    why: "Slow first byte hurts SEO, Core Web Vitals, and user bounce rate.",
    howToFix:
      "Host tips: Vercel/Netlify — enable CDN caching & edge; Cloudflare — cache HTML/static + Early Hints; WordPress — page cache (LiteSpeed/WP Rocket) + object cache; shared hosting — upgrade plan or move static assets to a CDN.",
    autoFixable: false,
    priority: 4,
  },
  weak_internal_links: {
    title: "Weak internal linking",
    why: "Internal links help users and crawlers discover important pages.",
    howToFix: "Link from this page to 3–5 related pages (services, blog, contact).",
    autoFixable: false,
    priority: 8,
  },
  missing_open_graph: {
    title: "Missing Open Graph tags",
    why: "OG tags improve social/AI link previews and brand clarity when URLs are shared.",
    howToFix: "Approve our Open Graph draft (title + description). Add og:image in your theme if you have a brand image.",
    autoFixable: true,
    priority: 7,
  },
};

export function getIssueOwnerGuide(issueType: string): IssueOwnerGuide {
  const g = ISSUE_OWNER_GUIDE[issueType as IssueType];
  if (g) return g;
  return {
    title: issueType.replace(/_/g, " "),
    why: "This was flagged during the scan.",
    howToFix: "Review the page and fix the underlying markup or hosting setting.",
    autoFixable: false,
    priority: 50,
  };
}

export type GrowthPillarScores = {
  seo: number;
  aeo: number;
  geo: number;
  /** Combined AI-visibility story score (AEO + GEO). */
  aiVisibility: number;
  overall: number;
};

const PILLAR_WEIGHT: Record<IssueType, number> = {
  missing_title: 12,
  missing_meta_description: 8,
  missing_h1: 6,
  multiple_h1: 3,
  missing_alt: 3,
  missing_canonical: 5,
  no_sitemap: 6,
  no_robots: 5,
  no_llms_txt: 8,
  no_schema: 10,
  https_required: 14,
  mixed_content: 7,
  thin_content: 6,
  missing_security_headers: 2,
  missing_viewport: 10,
  slow_ttfb: 9,
  weak_internal_links: 4,
  missing_open_graph: 5,
};

function clampScore(n: number, min = 5, max = 99) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

/** Score SEO / AEO / GEO from issue types found on a site. */
export function scoreGrowthPillars(
  issueTypes: string[],
  opts?: { connected?: boolean },
): GrowthPillarScores {
  const connected = opts?.connected ?? true;
  let seo = connected ? 92 : 55;
  let aeo = connected ? 90 : 55;
  let geo = connected ? 88 : 52;

  for (const raw of issueTypes) {
    const t = raw as IssueType;
    const w = PILLAR_WEIGHT[t] ?? 3;
    const pillars = ISSUE_PILLARS[t] ?? ["seo"];
    if (pillars.includes("seo")) seo -= w;
    if (pillars.includes("aeo")) aeo -= w;
    if (pillars.includes("geo")) geo -= w;
  }

  seo = clampScore(seo);
  aeo = clampScore(aeo);
  geo = clampScore(geo);
  const aiVisibility = clampScore((aeo + geo) / 2);
  const overall = clampScore(seo * 0.45 + aeo * 0.25 + geo * 0.3);
  return { seo, aeo, geo, aiVisibility, overall };
}
