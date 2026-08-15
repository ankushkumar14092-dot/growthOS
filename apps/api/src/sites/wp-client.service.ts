import { Injectable } from "@nestjs/common";
import { CredentialKind } from "@prisma/client";
import * as fs from "node:fs";
import * as path from "node:path";

export type WpHealthResult = {
  ok: boolean;
  statusCode: number;
  body?: {
    ok?: boolean;
    plugin_version?: string;
    wp_version?: string;
    seo_plugin?: string;
    writable?: boolean;
  };
  error?: string;
};

export type WpPatchPayload = {
  patch_id: string;
  target: Record<string, unknown>;
  after_state?: { value: unknown };
  before_state?: { value: unknown };
};

export type WpMutateResult = {
  ok: boolean;
  statusCode: number;
  body?: Record<string, unknown>;
  error?: string;
};

function mockEnabled(): boolean {
  return (
    process.env.MOCK_WP_HEALTH === "1" || process.env.MOCK_WP_DEPLOY === "1"
  );
}

function mockDir(): string {
  return (
    process.env.MOCK_WP_STORAGE ??
    path.join(process.cwd(), "storage", "mock-wp")
  );
}

function mockPath(siteId: string): string {
  return path.join(mockDir(), `${siteId}.json`);
}

export type MockWpState = {
  meta_title?: string | null;
  meta_description?: string | null;
  faq_schema?: string | null;
  [key: string]: unknown;
};

@Injectable()
export class WpClientService {
  isMock(): boolean {
    return mockEnabled();
  }

  readMockState(siteId: string): MockWpState {
    const file = mockPath(siteId);
    if (!fs.existsSync(file)) return {};
    try {
      return JSON.parse(fs.readFileSync(file, "utf8")) as MockWpState;
    } catch {
      return {};
    }
  }

  writeMockState(siteId: string, state: MockWpState): void {
    const dir = mockDir();
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(mockPath(siteId), JSON.stringify(state, null, 2), "utf8");
  }

  slotForTarget(target: Record<string, unknown>): string {
    const key = typeof target.key === "string" ? target.key : "";
    if (
      key === "rank_math_title" ||
      key === "aigos_meta_title" ||
      key.includes("title")
    ) {
      return "meta_title";
    }
    if (
      key === "rank_math_description" ||
      key === "aigos_meta_description" ||
      key.includes("description")
    ) {
      return "meta_description";
    }
    if (key === "faq_schema_jsonld" || key.includes("faq")) {
      return "faq_schema";
    }
    if (key === "aigos_canonical" || key.includes("canonical")) {
      return "canonical";
    }
    if (key === "aigos_open_graph" || key.includes("open_graph")) {
      return "open_graph";
    }
    if (key === "aigos_llms_txt" || key.includes("llms")) {
      return "llms_txt";
    }
    if (key === "aigos_robots_txt" || key.includes("robots")) {
      return "robots_txt";
    }
    if (key === "aigos_sitemap_xml" || key.includes("sitemap")) {
      return "sitemap_xml";
    }
    return key || "unknown";
  }

  async healthCheck(opts: {
    baseUrl: string;
    kind: CredentialKind;
    token: string;
    username?: string;
  }): Promise<WpHealthResult> {
    if (mockEnabled()) {
      return {
        ok: true,
        statusCode: 200,
        body: {
          ok: true,
          plugin_version: "0.5.0-mock",
          wp_version: "6.x",
          seo_plugin: "none",
          writable: true,
        },
      };
    }

    return this.requestJson("GET", `${opts.baseUrl.replace(/\/$/, "")}/wp-json/ai-growth-os/v1/health`, opts);
  }

  async applyPatch(opts: {
    siteId: string;
    baseUrl: string;
    kind: CredentialKind;
    token: string;
    username?: string;
    payload: WpPatchPayload;
  }): Promise<WpMutateResult> {
    if (mockEnabled()) {
      const slot = this.slotForTarget(opts.payload.target);
      const state = this.readMockState(opts.siteId);
      const before = state[slot] ?? null;
      state[slot] = opts.payload.after_state?.value ?? null;
      this.writeMockState(opts.siteId, state);
      return {
        ok: true,
        statusCode: 200,
        body: {
          ok: true,
          patch_id: opts.payload.patch_id,
          slot,
          before_state: { value: before },
          after_state: opts.payload.after_state,
        },
      };
    }

    return this.requestJson(
      "POST",
      `${opts.baseUrl.replace(/\/$/, "")}/wp-json/ai-growth-os/v1/apply_patch`,
      opts,
      opts.payload,
    );
  }

  async rollback(opts: {
    siteId: string;
    baseUrl: string;
    kind: CredentialKind;
    token: string;
    username?: string;
    payload: WpPatchPayload;
  }): Promise<WpMutateResult> {
    if (mockEnabled()) {
      const slot = this.slotForTarget(opts.payload.target);
      const state = this.readMockState(opts.siteId);
      state[slot] = opts.payload.before_state?.value ?? null;
      this.writeMockState(opts.siteId, state);
      return {
        ok: true,
        statusCode: 200,
        body: {
          ok: true,
          patch_id: opts.payload.patch_id,
          restored: opts.payload.before_state,
        },
      };
    }

    return this.requestJson(
      "POST",
      `${opts.baseUrl.replace(/\/$/, "")}/wp-json/ai-growth-os/v1/rollback`,
      opts,
      opts.payload,
    );
  }

  /** Synthetic HTML for mock verify (mirrors plugin wp_head injection). */
  renderMockHtml(siteId: string): string {
    const state = this.readMockState(siteId);
    const title =
      typeof state.meta_title === "string" && state.meta_title
        ? state.meta_title
        : "Mock Site";
    const desc =
      typeof state.meta_description === "string" && state.meta_description
        ? `<meta name="description" content="${escapeAttr(state.meta_description)}" />`
        : "";
    const faq =
      typeof state.faq_schema === "string" && state.faq_schema
        ? `<script type="application/ld+json">${state.faq_schema}</script>`
        : "";
    const canonical =
      typeof state.canonical === "string" && state.canonical
        ? `<link rel="canonical" href="${escapeAttr(state.canonical)}" />`
        : "";
    const og =
      typeof state.open_graph === "string" && state.open_graph
        ? state.open_graph
        : "";
    return `<!doctype html><html><head><title>${escapeHtml(title)}</title>${desc}${canonical}${og}${faq}</head><body><h1>${escapeHtml(title)}</h1></body></html>`;
  }

  private async requestJson(
    method: "GET" | "POST",
    url: string,
    auth: {
      kind: CredentialKind;
      token: string;
      username?: string;
    },
    body?: unknown,
  ): Promise<WpHealthResult & WpMutateResult> {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (method === "POST") {
      headers["Content-Type"] = "application/json";
    }

    if (auth.kind === CredentialKind.plugin_token) {
      headers.Authorization = `Bearer ${auth.token}`;
    } else {
      const user = auth.username ?? "";
      const basic = Buffer.from(`${user}:${auth.token}`).toString("base64");
      headers.Authorization = `Basic ${basic}`;
    }

    try {
      const res = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(20_000),
      });
      const text = await res.text();
      let parsed: Record<string, unknown> | undefined;
      try {
        parsed = JSON.parse(text) as Record<string, unknown>;
      } catch {
        return {
          ok: false,
          statusCode: res.status,
          error: "invalid_json",
        };
      }

      const ok = res.ok && parsed?.ok === true;
      return {
        ok,
        statusCode: res.status,
        body: parsed,
        error: ok ? undefined : String(parsed?.error ?? "request_failed"),
      };
    } catch (err) {
      return {
        ok: false,
        statusCode: 0,
        error: err instanceof Error ? err.message : "unreachable",
      };
    }
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, "&#39;");
}
