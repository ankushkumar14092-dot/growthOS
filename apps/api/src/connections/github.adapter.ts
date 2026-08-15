import { Injectable } from "@nestjs/common";
import {
  ConnectionAdapter,
  SiteConnectionContext,
  VerifyResult,
  nowIso,
} from "./types";

function parseRepo(input: string): { owner: string; repo: string } | null {
  const raw = input.trim().replace(/\.git$/, "");
  const https = raw.match(/github\.com[/:]([^/]+)\/([^/]+)/i);
  if (https) return { owner: https[1], repo: https[2] };
  const short = raw.match(/^([^/]+)\/([^/]+)$/);
  if (short) return { owner: short[1], repo: short[2] };
  return null;
}

@Injectable()
export class GithubAdapter implements ConnectionAdapter {
  readonly type = "github" as const;

  async verify(ctx: SiteConnectionContext): Promise<VerifyResult> {
    const repoRaw =
      (typeof ctx.settings.repo === "string" && ctx.settings.repo) ||
      ctx.domain;
    const parsed = parseRepo(repoRaw);
    if (!parsed) {
      return {
        ok: false,
        status: "unhealthy",
        error: "invalid_github_repo",
        checkedAt: nowIso(),
      };
    }

    if (!ctx.credential?.secret) {
      return {
        ok: false,
        status: "disconnected",
        error: "no_github_token",
        checkedAt: nowIso(),
      };
    }

    const url = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`;
    try {
      const res = await fetch(url, {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${ctx.credential.secret}`,
          "User-Agent": "AI-Growth-OS",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        signal: AbortSignal.timeout(12_000),
      });
      const body = (await res.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      const ok = res.ok;
      return {
        ok,
        status: ok ? "healthy" : "unhealthy",
        statusCode: res.status,
        details: {
          repo: `${parsed.owner}/${parsed.repo}`,
          defaultBranch: body.default_branch,
          private: body.private,
          mode: "github_pr_workflow",
          permissions: body.permissions,
        },
        error: ok ? undefined : "github_repo_inaccessible",
        checkedAt: nowIso(),
      };
    } catch (err) {
      return {
        ok: false,
        status: "unhealthy",
        statusCode: 0,
        error: err instanceof Error ? err.message : "github_unreachable",
        checkedAt: nowIso(),
      };
    }
  }
}

export { parseRepo };
