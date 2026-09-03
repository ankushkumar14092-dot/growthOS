import { getApiUrl } from "./api-url";

const API_URL = () => getApiUrl();

export type AuthResponse = {
  accessToken: string;
  user: { id: string; email: string };
};

export type MeResponse = {
  id: string;
  email: string;
  profile: { name?: string };
  memberships: Array<{
    id: string;
    role: "owner" | "member";
    organization: { id: string; name: string; plan: string };
  }>;
};

export type ConnectionType = "wordpress" | "github" | "zip" | "url_audit";

export type ConnectionTypeInfo = {
  type: ConnectionType;
  label: string;
  summary: string;
  canAnalyze: boolean;
  canDeploy: boolean;
  canVerify: boolean;
  canRollback: boolean;
  deployMode?: string;
};

export type SiteDto = {
  id: string;
  organizationId: string;
  domain: string;
  connectionType: ConnectionType;
  cms: string;
  settings: Record<string, unknown>;
  healthStatus: string | null;
  connected: boolean;
  credentialKind: string | null;
  capabilities?: ConnectionTypeInfo;
  createdAt: string;
  updatedAt: string;
};

function authHeaders(token?: string | null): HeadersInit {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

const API_ERROR_LABELS: Record<string, string> = {
  razorpay_plan_not_configured:
    "Paid plans aren’t set up yet. Add Razorpay plan IDs on the API, or stay on Free for now.",
  checkout_not_needed_for_free: "You’re already on the Free plan.",
  site_limit_reached:
    "Site limit reached for your plan. Upgrade on Billing to add more sites.",
  scan_limit_reached:
    "Monthly scan limit reached for your plan. Upgrade on Billing for more scans.",
  org_not_found: "Workspace not found.",
  unauthorized: "Please sign in again.",
  Forbidden: "You don’t have permission for that.",
};

/** Turn Nest/API error bodies into short, human-readable copy. */
export function friendlyApiMessage(raw: string): string {
  let code = raw.trim();
  try {
    const parsed = JSON.parse(raw) as { message?: unknown };
    if (typeof parsed.message === "string") code = parsed.message;
    else if (Array.isArray(parsed.message)) {
      code = parsed.message.map(String).join(", ");
    }
  } catch {
    // plain text body
  }
  if (API_ERROR_LABELS[code]) return API_ERROR_LABELS[code];
  if (code.startsWith("{") || code.startsWith("[")) {
    return "Something went wrong. Try again.";
  }
  return code.replace(/_/g, " ");
}

async function apiError(res: Response): Promise<string> {
  return friendlyApiMessage(await res.text());
}


export async function apiSignup(body: {
  email: string;
  password: string;
  name: string;
}) {
  const res = await fetch(`${API_URL()}/auth/signup`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await apiError(res));
  return (await res.json()) as AuthResponse;
}

export async function apiLogin(body: { email: string; password: string }) {
  const res = await fetch(`${API_URL()}/auth/login`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await apiError(res));
  return (await res.json()) as AuthResponse;
}

export async function apiMe(token: string) {
  const res = await fetch(`${API_URL()}/auth/me`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await apiError(res));
  return (await res.json()) as MeResponse;
}

export async function apiCreateOrg(
  token: string,
  body: { name: string; plan?: string },
) {
  const res = await fetch(`${API_URL()}/organizations`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await apiError(res));
  return res.json();
}

export async function apiListOrgs(token: string) {
  const res = await fetch(`${API_URL()}/organizations`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await apiError(res));
  return res.json();
}

export async function apiConnectionTypes(token: string) {
  const res = await fetch(`${API_URL()}/sites/connection-types`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await apiError(res));
  return (await res.json()) as ConnectionTypeInfo[];
}

export async function apiListSites(token: string, organizationId: string) {
  const res = await fetch(
    `${API_URL()}/sites?organizationId=${encodeURIComponent(organizationId)}`,
    { headers: authHeaders(token), cache: "no-store" },
  );
  if (!res.ok) throw new Error(await apiError(res));
  return (await res.json()) as SiteDto[];
}

export async function apiGetSite(token: string, siteId: string) {
  const res = await fetch(`${API_URL()}/sites/${siteId}`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await apiError(res));
  return (await res.json()) as SiteDto;
}

export async function apiCreateSite(
  token: string,
  body: {
    organizationId: string;
    connectionType: ConnectionType;
    domain: string;
    baseUrl?: string;
    repo?: string;
  },
) {
  const res = await fetch(`${API_URL()}/sites`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await apiError(res));
  return (await res.json()) as SiteDto;
}

export async function apiDeleteSite(token: string, siteId: string) {
  const res = await fetch(`${API_URL()}/sites/${siteId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await apiError(res));
  return (await res.json()) as { ok: boolean; id: string };
}

export async function apiConnectSite(
  token: string,
  siteId: string,
  body: Record<string, unknown>,
) {
  const res = await fetch(`${API_URL()}/sites/${siteId}/connect`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await apiError(res));
  return res.json() as Promise<{
    site: SiteDto;
    health: { ok: boolean; status: string; error?: string; details?: unknown };
  }>;
}

export async function apiUploadZip(
  token: string,
  siteId: string,
  file: File,
) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_URL()}/sites/${siteId}/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  if (!res.ok) throw new Error(await apiError(res));
  return res.json() as Promise<{
    site: SiteDto;
    health: { ok: boolean; status: string };
    detected: { framework: string; filename: string; size: number };
  }>;
}

export async function apiSiteHealth(token: string, siteId: string) {
  const res = await fetch(`${API_URL()}/sites/${siteId}/health`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await apiError(res));
  return res.json();
}

export type JobRunDto = {
  id: string;
  siteId?: string;
  status: string;
  errorCode?: string | null;
  errorMessage?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  createdAt: string;
  pageCount?: number;
  issueCount?: number;
  proposalCount?: number;
  connectionType?: string;
  domain?: string;
};

export async function apiStartAudit(token: string, siteId: string) {
  const res = await fetch(`${API_URL()}/sites/${siteId}/audits`, {
    method: "POST",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await apiError(res));
  return (await res.json()) as JobRunDto;
}

export async function apiGetJobRun(token: string, jobRunId: string) {
  const res = await fetch(`${API_URL()}/job-runs/${jobRunId}`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await apiError(res));
  return (await res.json()) as JobRunDto;
}

export async function apiListJobRuns(token: string, siteId: string) {
  const res = await fetch(`${API_URL()}/sites/${siteId}/job-runs`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await apiError(res));
  return (await res.json()) as JobRunDto[];
}

export type IssueDto = {
  id: string;
  jobRunId: string;
  issueType: string;
  severity: string;
  evidence: Record<string, unknown>;
  resolved: boolean;
  pageUrl: string | null;
  createdAt: string;
};

export async function apiListIssues(
  token: string,
  siteId: string,
  jobRunId?: string,
) {
  const q = jobRunId ? `?jobRunId=${encodeURIComponent(jobRunId)}` : "";
  const res = await fetch(`${API_URL()}/sites/${siteId}/issues${q}`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await apiError(res));
  return (await res.json()) as IssueDto[];
}

export type ProposalDto = {
  id: string;
  siteId: string;
  issueId: string;
  jobRunId: string;
  proposalType: string;
  beforeValue: string;
  afterValue: string;
  businessImpact: string;
  impactType: string;
  reasoning: string;
  confidence: number;
  changeClass: string;
  status: string;
  source: string;
  model: string | null;
  promptVersion: string | null;
  issueType?: string;
  patchId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function apiListProposals(
  token: string,
  siteId: string,
  jobRunId?: string,
) {
  const q = jobRunId ? `?jobRunId=${encodeURIComponent(jobRunId)}` : "";
  const res = await fetch(`${API_URL()}/sites/${siteId}/proposals${q}`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await apiError(res));
  return (await res.json()) as ProposalDto[];
}

export async function apiApproveProposal(token: string, proposalId: string) {
  const res = await fetch(`${API_URL()}/proposals/${proposalId}/approve`, {
    method: "POST",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await apiError(res));
  return (await res.json()) as ProposalDto & { patchId?: string };
}

export async function apiRejectProposal(token: string, proposalId: string) {
  const res = await fetch(`${API_URL()}/proposals/${proposalId}/reject`, {
    method: "POST",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await apiError(res));
  return (await res.json()) as ProposalDto;
}

export type DeploymentDto = {
  id: string;
  siteId: string;
  patchId: string;
  proposalId?: string | null;
  action: string;
  status: string;
  errorMessage?: string | null;
  rollbackOfId?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  proposalType?: string;
  beforeValue?: string;
  afterValue?: string;
  businessImpact?: string;
  verifyResult?: {
    pass?: boolean;
    mode?: string;
    note?: string;
    liveMatched?: boolean;
    checks?: Array<{ name: string; pass: boolean; detail?: string }>;
    observed?: Record<string, unknown>;
  } | null;
  backup?: Record<string, unknown> | null;
  changeClass?: string;
  deployMode?: string | null;
  connectionType?: string | null;
  prUrl?: string | null;
};

export type DeploymentDetailDto = DeploymentDto & {
  events: Array<{
    id: string;
    event: string;
    message: string | null;
    meta: unknown;
    createdAt: string;
  }>;
  timeline: Array<{
    at: string;
    label: string;
    event: string;
    ok: boolean;
  }>;
  trust?: {
    verified: boolean;
    safe: boolean;
    rollbackAvailable: boolean;
    backupStored: boolean;
  };
};

export async function apiDeploySite(
  token: string,
  siteId: string,
  body?: { patchIds?: string[] },
) {
  const res = await fetch(`${API_URL()}/sites/${siteId}/deploy`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) throw new Error(await apiError(res));
  return (await res.json()) as { deployments: DeploymentDto[] };
}

export async function apiListDeployments(token: string, siteId: string) {
  const res = await fetch(`${API_URL()}/sites/${siteId}/deployments`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await apiError(res));
  return (await res.json()) as DeploymentDto[];
}

export async function apiGetDeployment(token: string, deploymentId: string) {
  const res = await fetch(`${API_URL()}/deployments/${deploymentId}`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await apiError(res));
  return (await res.json()) as DeploymentDetailDto;
}

export async function apiRollbackDeployment(
  token: string,
  deploymentId: string,
) {
  const res = await fetch(`${API_URL()}/deployments/${deploymentId}/rollback`, {
    method: "POST",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await apiError(res));
  return (await res.json()) as DeploymentDto;
}

export type MissionControlDto = {
  organization: { id: string; name: string; plan: string };
  kpis: {
    overallHealth: number;
    healthDeltaWeek: number;
    activeWebsites: number;
    pendingProposals: number;
    needsApproval: number;
    deploying: number;
    failedDeployments: number;
    openIssues: number;
  };
  growthPulse: {
    metaImprovements: number;
    faqAdded: number;
    issuesResolved: number;
    deploymentSuccessRate: number;
    rollbacks: number;
    period: string;
  };
  activity: Array<{
    id: string;
    at: string;
    label: string;
    kind: string;
    href: string;
    domain: string;
    ok: boolean;
  }>;
  notifications: Array<{
    id: string;
    severity: "info" | "warning" | "error" | "success";
    title: string;
    body: string;
    href: string;
  }>;
  priorityTasks: Array<{
    id: string;
    label: string;
    href: string;
    urgency: "high" | "medium" | "low";
  }>;
  sites: Array<{
    id: string;
    domain: string;
    connectionType: string;
    healthStatus: string | null;
    connected: boolean;
    health: number;
    seo: number;
    aeo: number;
    geo: number;
    aiVisibility: number;
    pending: number;
    deploymentsToday: number;
    openIssues: number;
    criticalIssues: number;
    lastScanAt: string | null;
    lastJobStatus: string | null;
    lastJobId: string | null;
  }>;
  generatedAt: string;
};

export type SearchHit = {
  type: "site" | "proposal" | "deployment" | "issue";
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

export async function apiMissionControl(token: string, orgId: string) {
  const res = await fetch(
    `${API_URL()}/organizations/${orgId}/mission-control`,
    { headers: authHeaders(token), cache: "no-store" },
  );
  if (!res.ok) throw new Error(await apiError(res));
  return (await res.json()) as MissionControlDto;
}

export async function apiSearch(token: string, orgId: string, q: string) {
  const res = await fetch(
    `${API_URL()}/organizations/${orgId}/search?q=${encodeURIComponent(q)}`,
    { headers: authHeaders(token), cache: "no-store" },
  );
  if (!res.ok) throw new Error(await apiError(res));
  return (await res.json()) as { query: string; results: SearchHit[] };
}

export type BillingSummaryDto = {
  organizationId: string;
  plan: string;
  planLabel: string;
  priceLabel: string;
  razorpayConfigured: boolean;
  limits: {
    sites: number;
    scansPerMonth: number;
    label: string;
    priceLabel: string;
    priceInr?: number;
  };
  usage: {
    sites: number;
    scansThisPeriod: number;
    byMetric: Record<string, { quantity: number; events: number }>;
  };
  plans: Array<{
    id: string;
    sites: number;
    scansPerMonth: number;
    label: string;
    priceLabel: string;
    priceInr?: number;
  }>;
  subscription: {
    id: string;
    active: boolean;
    razorpaySubscriptionId: string | null;
  };
};

export type PilotMetricsDto = {
  sites: number;
  scans: { total: number; thisWeek: number; completionRate: number };
  proposals: { total: number; approved: number; approvalRate: number };
  deployments: {
    apply: number;
    succeeded: number;
    failed: number;
    rollbacks: number;
    successRate: number;
    rollbackRate: number;
  };
  wau: number;
  targets: { approvalRate: number; deploySuccessRate: number };
};

export async function apiBilling(token: string, orgId: string) {
  const res = await fetch(`${API_URL()}/organizations/${orgId}/billing`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await apiError(res));
  return (await res.json()) as BillingSummaryDto;
}

export async function apiBillingCheckout(
  token: string,
  orgId: string,
  plan: "starter" | "agency",
) {
  const res = await fetch(`${API_URL()}/organizations/${orgId}/billing/checkout`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ plan }),
  });
  if (!res.ok) throw new Error(await apiError(res));
  return (await res.json()) as {
    mode: string;
    url: string;
    message?: string;
    paymentLinkId?: string;
    subscriptionId?: string;
    keyId?: string;
  };
}

export async function apiBillingConfirmLink(
  token: string,
  orgId: string,
  paymentLinkId: string,
) {
  const res = await fetch(
    `${API_URL()}/organizations/${orgId}/billing/confirm-link`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ paymentLinkId }),
    },
  );
  if (!res.ok) throw new Error(await apiError(res));
  return (await res.json()) as {
    activated: boolean;
    status: string;
    plan?: string;
  };
}

export async function apiBillingPortal(token: string, orgId: string) {
  const res = await fetch(`${API_URL()}/organizations/${orgId}/billing/portal`, {
    method: "POST",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await apiError(res));
  return (await res.json()) as { mode: string; url: string; message?: string };
}

export async function apiPilotMetrics(token: string, orgId: string) {
  const res = await fetch(`${API_URL()}/organizations/${orgId}/pilot-metrics`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await apiError(res));
  return (await res.json()) as PilotMetricsDto;
}

export async function apiPatchSiteSettings(
  token: string,
  siteId: string,
  body: { schedule?: "weekly" | "manual"; safe_auto_apply?: boolean; base_url?: string },
) {
  const res = await fetch(`${API_URL()}/sites/${siteId}/settings`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await apiError(res));
  return (await res.json()) as SiteDto;
}

export type SiteResearchDto = {
  query: string;
  domain: string;
  configured: { tavily: boolean; serp: boolean; serpProvider: string | null };
  keywords: Array<{ phrase: string; source: string }>;
  serpResults: Array<{
    position: number;
    title: string;
    link: string;
    snippet: string;
  }>;
  research: Array<{ title: string; url: string; content: string }>;
  peopleAlsoAsk: string[];
  suggestions: string[];
  errors: string[];
  ranAt: string;
};

export async function apiResearchStatus(token: string) {
  const res = await fetch(`${API_URL()}/research/status`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await apiError(res));
  return (await res.json()) as {
    tavily: boolean;
    serp: boolean;
    serpProvider: string | null;
  };
}

export async function apiGetSiteResearch(token: string, siteId: string) {
  const res = await fetch(`${API_URL()}/sites/${siteId}/research`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await apiError(res));
  return (await res.json()) as {
    configured: { tavily: boolean; serp: boolean; serpProvider: string | null };
    research: SiteResearchDto | null;
  };
}

export async function apiRunSiteResearch(
  token: string,
  siteId: string,
  query?: string,
) {
  const res = await fetch(`${API_URL()}/sites/${siteId}/research`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(query ? { query } : {}),
  });
  if (!res.ok) throw new Error(await apiError(res));
  return (await res.json()) as SiteResearchDto;
}

export type ResearchApplyResultDto = {
  ok: boolean;
  jobRunId: string;
  created: Array<{ id: string; proposalType: string }>;
  approved: Array<{ id: string; proposalType: string; patchId?: string }>;
  next: string;
  connectionType: ConnectionType;
  note: string | null;
};

export async function apiApplySiteResearch(
  token: string,
  siteId: string,
  opts?: { approve?: boolean },
) {
  const res = await fetch(`${API_URL()}/sites/${siteId}/research/apply`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ approve: opts?.approve !== false }),
  });
  if (!res.ok) throw new Error(await apiError(res));
  return (await res.json()) as ResearchApplyResultDto;
}

export const TOKEN_KEY = "aigos_token";
