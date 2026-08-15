import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PROMPT_VERSION } from "@ai-growth-os/shared";
import { Prisma } from "@prisma/client";
import { UsageService } from "../billing/usage.service";
import { PrismaService } from "../prisma/prisma.service";
import { ProposalsService } from "../proposals/proposals.service";
import { SitesService } from "../sites/sites.service";
import { draftsFromResearch } from "./research-apply";

type ResearchResult = {
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

@Injectable()
export class ResearchService {
  private readonly logger = new Logger(ResearchService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly sites: SitesService,
    private readonly prisma: PrismaService,
    private readonly usage: UsageService,
    private readonly proposals: ProposalsService,
  ) {}

  status() {
    return {
      tavily: Boolean(this.config.get("TAVILY_API_KEY")),
      serp: Boolean(this.config.get("SERP_API_KEY")),
      serpProvider: this.config.get<string>("SERP_PROVIDER") ?? "serpapi",
    };
  }

  async researchSite(
    userId: string,
    siteId: string,
    opts?: { query?: string },
  ): Promise<ResearchResult> {
    const site = await this.sites.get(userId, siteId);
    const configured = this.status();
    if (!configured.tavily && !configured.serp) {
      throw new ServiceUnavailableException(
        "research_keys_missing: set TAVILY_API_KEY and/or SERP_API_KEY",
      );
    }

    const brand = site.domain.replace(/^www\./, "");
    const query =
      (opts?.query ?? "").trim() ||
      `${brand.replace(/\./g, " ")} SEO AI visibility`;

    const errors: string[] = [];
    let keywords: ResearchResult["keywords"] = [];
    let serpResults: ResearchResult["serpResults"] = [];
    let peopleAlsoAsk: string[] = [];
    let research: ResearchResult["research"] = [];

    if (configured.serp) {
      try {
        const serp = await this.runSerp(query);
        serpResults = serp.results;
        peopleAlsoAsk = serp.peopleAlsoAsk;
        keywords = serp.keywords;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "serp_failed";
        this.logger.warn(`serp: ${msg}`);
        errors.push(`serp: ${msg}`);
      }
    }

    if (configured.tavily) {
      try {
        research = await this.runTavily(
          `${query} best practices for ${brand}`,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "tavily_failed";
        this.logger.warn(`tavily: ${msg}`);
        errors.push(`tavily: ${msg}`);
      }
    }

    // Seed keyword from domain brand if SERP empty
    if (keywords.length === 0) {
      const seed = brand.split(".")[0]?.replace(/[-_]/g, " ") ?? brand;
      keywords = [
        { phrase: seed, source: "domain" },
        { phrase: `${seed} AI`, source: "domain" },
        { phrase: `${seed} SEO`, source: "domain" },
      ];
    }

    const suggestions = this.buildSuggestions({
      domain: brand,
      keywords,
      serpResults,
      peopleAlsoAsk,
      research,
    });

    const payload: ResearchResult = {
      query,
      domain: brand,
      configured,
      keywords: keywords.slice(0, 20),
      serpResults: serpResults.slice(0, 10),
      research: research.slice(0, 8),
      peopleAlsoAsk: peopleAlsoAsk.slice(0, 8),
      suggestions,
      errors,
      ranAt: new Date().toISOString(),
    };

    const settings = {
      ...((site.settings as Record<string, unknown>) ?? {}),
      research_last: payload,
    };
    await this.prisma.site.update({
      where: { id: site.id },
      data: { settings: settings as Prisma.InputJsonValue },
    });

    await this.usage.record(site.organizationId, "ai_generation", {
      meta: {
        siteId: site.id,
        kind: "web_research",
        query,
      },
    });

    return payload;
  }

  async getCached(userId: string, siteId: string) {
    const site = await this.sites.get(userId, siteId);
    const settings = (site.settings as Record<string, unknown>) ?? {};
    return {
      configured: this.status(),
      research: (settings.research_last as ResearchResult | undefined) ?? null,
    };
  }

  /**
   * Turn last research into pending (and optionally approved) proposals
   * so Approve → Deploy can write SEO/AEO/GEO signals to the real site.
   */
  async applyResearch(
    userId: string,
    siteId: string,
    opts?: { approve?: boolean },
  ) {
    const site = await this.sites.get(userId, siteId);
    const settings = (site.settings as Record<string, unknown>) ?? {};
    const research = settings.research_last as ResearchResult | undefined;
    if (!research?.keywords?.length && !research?.peopleAlsoAsk?.length) {
      throw new BadRequestException("run_research_first");
    }

    const jobInclude = {
      crawl: {
        include: { pages: { take: 1, orderBy: { createdAt: "asc" as const } } },
      },
    };

    let job = await this.prisma.jobRun.findFirst({
      where: {
        siteId: site.id,
        status: { in: ["done", "awaiting_approval"] },
      },
      orderBy: { createdAt: "desc" },
      include: jobInclude,
    });

    if (!job) {
      job = await this.prisma.jobRun.create({
        data: {
          siteId: site.id,
          status: "awaiting_approval",
          finishedAt: new Date(),
        },
        include: jobInclude,
      });
    }

    let page = job.crawl?.pages[0];
    if (!page) {
      const crawl =
        job.crawl ??
        (await this.prisma.crawl.create({
          data: {
            jobRunId: job.id,
            pageCount: 1,
            meta: { source: "research" },
          },
        }));
      page = await this.prisma.page.create({
        data: {
          crawlId: crawl.id,
          url: `https://${site.domain}/`,
          httpStatus: 200,
          extracted: {},
        },
      });
    }

    const pageUrl = page.url || `https://${site.domain}/`;
    const drafts = draftsFromResearch(
      {
        query: research.query,
        domain: research.domain || site.domain,
        keywords: research.keywords ?? [],
        peopleAlsoAsk: research.peopleAlsoAsk ?? [],
        suggestions: research.suggestions ?? [],
      },
      pageUrl,
    );

    const created: Array<{ id: string; proposalType: string }> = [];
    const approved: Array<{ id: string; proposalType: string; patchId?: string }> =
      [];

    for (const draft of drafts) {
      // Supersede prior pending research-driven proposals of same type
      const prior = await this.prisma.proposal.findMany({
        where: {
          siteId: site.id,
          proposalType: draft.proposalType,
          status: "pending_review",
          source: "research",
        },
      });
      if (prior.length) {
        await this.prisma.proposal.updateMany({
          where: { id: { in: prior.map((p) => p.id) } },
          data: { status: "superseded" },
        });
      }

      let issue = await this.prisma.issue.findFirst({
        where: {
          jobRunId: job.id,
          issueType: draft.issueType,
          pageId: page.id,
        },
      });
      if (!issue) {
        issue = await this.prisma.issue.create({
          data: {
            jobRunId: job.id,
            pageId: page.id,
            issueType: draft.issueType,
            severity: "medium",
            evidence: {
              source: "research",
              query: research.query,
            } as Prisma.InputJsonValue,
          },
        });
      }

      const proposal = await this.prisma.proposal.create({
        data: {
          siteId: site.id,
          issueId: issue.id,
          jobRunId: job.id,
          proposalType: draft.proposalType,
          beforeValue: draft.beforeValue,
          afterValue: draft.afterValue,
          businessImpact: draft.businessImpact,
          impactType: draft.impactType,
          reasoning: draft.reasoning,
          confidence: draft.confidence,
          changeClass: draft.changeClass,
          status: "pending_review",
          source: "research",
          model: null,
          promptVersion: PROMPT_VERSION,
        },
      });
      await this.prisma.proposalEvent.create({
        data: {
          proposalId: proposal.id,
          event: "created",
          actor: "system",
          meta: { source: "research", query: research.query },
        },
      });
      created.push({ id: proposal.id, proposalType: proposal.proposalType });

      if (opts?.approve !== false) {
        try {
          const appr = await this.proposals.approve(userId, proposal.id);
          approved.push({
            id: proposal.id,
            proposalType: proposal.proposalType,
            patchId: appr.patchId,
          });
        } catch (err) {
          this.logger.warn(
            `research approve ${proposal.id}: ${err instanceof Error ? err.message : err}`,
          );
        }
      }
    }

    await this.prisma.jobRun.update({
      where: { id: job.id },
      data: { status: "awaiting_approval" },
    });

    await this.usage.record(site.organizationId, "ai_generation", {
      meta: {
        siteId: site.id,
        kind: "research_apply",
        created: created.length,
        approved: approved.length,
      },
    });

    return {
      ok: true,
      jobRunId: job.id,
      created,
      approved,
      next:
        approved.length > 0
          ? "Deploy approved patches to write SEO/AEO/GEO to the live site (WordPress or GitHub)."
          : "Review and Approve proposals, then Deploy.",
      connectionType: site.connectionType,
      note:
        site.connectionType === "url_audit"
          ? "Live URL cannot write the host — reconnect via WordPress or GitHub for real-page apply."
          : null,
    };
  }

  private async runTavily(query: string) {
    const key = this.config.get<string>("TAVILY_API_KEY")?.trim();
    if (!key) throw new BadRequestException("tavily_key_missing");

    const res = await this.fetchWithRetry("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        query,
        api_key: key,
        search_depth: "basic",
        max_results: 6,
        include_answer: false,
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`tavily_http_${res.status}:${t.slice(0, 180)}`);
    }
    const body = (await res.json()) as {
      results?: Array<{ title?: string; url?: string; content?: string }>;
    };
    return (body.results ?? [])
      .filter((r) => r.url)
      .map((r) => ({
        title: r.title ?? r.url ?? "",
        url: r.url ?? "",
        content: (r.content ?? "").slice(0, 400),
      }));
  }

  private async runSerp(query: string) {
    const key = this.config.get<string>("SERP_API_KEY")?.trim();
    if (!key) throw new BadRequestException("serp_key_missing");
    const provider = (
      this.config.get<string>("SERP_PROVIDER") ?? "serpapi"
    ).toLowerCase();

    if (provider !== "serpapi") {
      throw new Error(`serp_provider_unsupported:${provider}`);
    }

    const url = new URL("https://serpapi.com/search.json");
    url.searchParams.set("engine", "google");
    url.searchParams.set("q", query);
    url.searchParams.set("api_key", key);
    url.searchParams.set("num", "10");

    const res = await this.fetchWithRetry(url.toString(), { method: "GET" });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`serp_http_${res.status}:${t.slice(0, 180)}`);
    }
    const body = (await res.json()) as {
      organic_results?: Array<{
        position?: number;
        title?: string;
        link?: string;
        snippet?: string;
      }>;
      related_searches?: Array<{ query?: string }>;
      related_questions?: Array<{ question?: string }>;
      error?: string;
    };
    if (body.error) throw new Error(body.error);

    const results = (body.organic_results ?? []).map((r, i) => ({
      position: r.position ?? i + 1,
      title: r.title ?? "",
      link: r.link ?? "",
      snippet: r.snippet ?? "",
    }));

    const keywords: Array<{ phrase: string; source: string }> = [];
    for (const rs of body.related_searches ?? []) {
      if (rs.query) keywords.push({ phrase: rs.query, source: "related_searches" });
    }
    const peopleAlsoAsk = (body.related_questions ?? [])
      .map((q) => q.question ?? "")
      .filter(Boolean);
    for (const q of peopleAlsoAsk) {
      keywords.push({ phrase: q, source: "people_also_ask" });
    }

    return { results, keywords, peopleAlsoAsk };
  }

  /** Retry transient undici "fetch failed" / network blips. */
  private async fetchWithRetry(
    url: string,
    init: RequestInit,
    attempts = 3,
  ): Promise<Response> {
    let lastErr: unknown;
    for (let i = 0; i < attempts; i++) {
      try {
        return await fetch(url, {
          ...init,
          signal: AbortSignal.timeout(30_000),
        });
      } catch (err) {
        lastErr = err;
        const transient = this.isTransientNetworkError(err);
        if (!transient || i === attempts - 1) {
          throw new Error(this.formatFetchError(err));
        }
        await new Promise((r) => setTimeout(r, 400 * (i + 1)));
      }
    }
    throw new Error(this.formatFetchError(lastErr));
  }

  private isTransientNetworkError(err: unknown): boolean {
    const msg = err instanceof Error ? err.message : String(err);
    const cause = err instanceof Error ? (err as Error & { cause?: { code?: string } }).cause : undefined;
    const code = cause?.code ?? "";
    return (
      msg.includes("fetch failed") ||
      code === "ECONNRESET" ||
      code === "ETIMEDOUT" ||
      code === "ENOTFOUND" ||
      code === "UND_ERR_CONNECT_TIMEOUT"
    );
  }

  private formatFetchError(err: unknown): string {
    if (!(err instanceof Error)) return String(err);
    const cause = (err as Error & { cause?: { code?: string; message?: string } }).cause;
    const code = cause?.code ? `:${cause.code}` : "";
    return `${err.message}${code}`;
  }

  private buildSuggestions(input: {
    domain: string;
    keywords: Array<{ phrase: string; source: string }>;
    serpResults: Array<{ title: string; link: string; snippet: string }>;
    peopleAlsoAsk: string[];
    research: Array<{ title: string; url: string; content: string }>;
  }): string[] {
    const out: string[] = [];
    const topKw = input.keywords[0]?.phrase;
    if (topKw) {
      out.push(
        `Consider targeting “${topKw}” in title/H1 and a short FAQ answer (AEO).`,
      );
    }
    if (input.peopleAlsoAsk[0]) {
      out.push(
        `Add FAQ schema covering: “${input.peopleAlsoAsk[0]}” (helps AEO/GEO).`,
      );
    }
    if (input.serpResults[0]?.title) {
      out.push(
        `Top SERP title pattern to study: “${input.serpResults[0].title}”.`,
      );
    }
    out.push(
      `Publish /llms.txt + sitemap for ${input.domain}, then re-scan in Growth OS.`,
    );
    out.push(
      `Live apply still needs WordPress plugin or GitHub merge — research alone does not change the page.`,
    );
    if (input.research[0]?.url) {
      out.push(`Research source to review: ${input.research[0].url}`);
    }
    return out.slice(0, 6);
  }
}
