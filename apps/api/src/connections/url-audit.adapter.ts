import { Injectable } from "@nestjs/common";
import { ensureAbsoluteHttpUrl } from "./normalize-origin";
import {
  ConnectionAdapter,
  SiteConnectionContext,
  VerifyResult,
  nowIso,
} from "./types";

@Injectable()
export class UrlAuditAdapter implements ConnectionAdapter {
  readonly type = "url_audit" as const;

  async verify(ctx: SiteConnectionContext): Promise<VerifyResult> {
    const baseUrl = ensureAbsoluteHttpUrl(
      typeof ctx.settings.base_url === "string" ? ctx.settings.base_url : null,
      ctx.domain,
    );

    try {
      const res = await fetch(baseUrl, {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(12_000),
        headers: { "User-Agent": "AI-Growth-OS/0.1 (+url-audit)" },
      });
      const ok = res.status >= 200 && res.status < 400;
      const contentType = res.headers.get("content-type") ?? "";
      return {
        ok,
        status: ok ? "healthy" : "unhealthy",
        statusCode: res.status,
        details: {
          url: baseUrl,
          contentType,
          mode: "read_only_audit",
        },
        error: ok ? undefined : "url_unreachable",
        checkedAt: nowIso(),
      };
    } catch (err) {
      return {
        ok: false,
        status: "unhealthy",
        statusCode: 0,
        details: { url: baseUrl, mode: "read_only_audit" },
        error: err instanceof Error ? err.message : "url_unreachable",
        checkedAt: nowIso(),
      };
    }
  }
}
