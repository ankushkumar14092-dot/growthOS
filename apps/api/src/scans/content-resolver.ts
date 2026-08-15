import { Injectable } from "@nestjs/common";
import { ConnectionType } from "@prisma/client";
import AdmZip from "adm-zip";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { ensureAbsoluteHttpUrl } from "../connections/normalize-origin";
import { decryptSecret } from "../crypto/secrets";
import { PrismaService } from "../prisma/prisma.service";
import { extractFromHtml, PageExtracted } from "./html-extract";
import {
  isDisallowed,
  parseRobotsTxt,
  parseSitemapUrls,
  RobotsRules,
} from "./robots-sitemap";
import { SCAN_PAGE_CAP } from "@ai-growth-os/shared";

export type ResolvedDocument = {
  url: string;
  html: string;
  httpStatus: number | null;
  headers: Record<string, string>;
  bytes: number;
  ttfbMs?: number;
  source: "http" | "zip" | "github";
};

export type CrawlBundle = {
  seedUrl: string;
  documents: ResolvedDocument[];
  hasRobots: boolean;
  hasSitemap: boolean;
  hasLlmsTxt: boolean;
  robots: RobotsRules;
  meta: Record<string, unknown>;
};

@Injectable()
export class ContentResolver {
  constructor(private readonly prisma: PrismaService) {}

  async resolveSite(siteId: string): Promise<CrawlBundle> {
    const site = await this.prisma.site.findFirst({
      where: { id: siteId, deletedAt: null },
      include: { credential: true },
    });
    if (!site) throw new Error("site_not_found");

    const settings = (site.settings ?? {}) as Record<string, unknown>;
    const type = site.connectionType;

    if (type === ConnectionType.zip) {
      return this.resolveZip(settings);
    }
    if (type === ConnectionType.github) {
      const token = site.credential
        ? decryptSecret(Buffer.from(site.credential.secretCiphertext))
        : "";
      const live = ensureAbsoluteHttpUrl(
        typeof settings.base_url === "string" ? settings.base_url : null,
      );
      if (live) {
        return this.resolveLive(live);
      }
      return this.resolveGithub(
        String(settings.repo ?? site.domain),
        token,
      );
    }
    const base = ensureAbsoluteHttpUrl(
      typeof settings.base_url === "string" ? settings.base_url : null,
      site.domain,
    );
    return this.resolveLive(base);
  }

  private async resolveLive(baseUrl: string): Promise<CrawlBundle> {
    const origin = ensureAbsoluteHttpUrl(baseUrl);
    const seedUrl = origin;
    const robotsUrl = `${origin}/robots.txt`;
    const sitemapUrl = `${origin}/sitemap.xml`;
    const llmsUrl = `${origin}/llms.txt`;

    let robots: RobotsRules = { fetched: false, disallow: [] };
    let hasRobots = false;
    let hasSitemap = false;
    let hasLlmsTxt = false;

    try {
      const r = await this.fetchText(robotsUrl);
      if (r.ok) {
        hasRobots = true;
        robots = parseRobotsTxt(r.text);
        robots.raw = r.text.slice(0, 2000);
      }
    } catch {
      /* ignore */
    }

    const seedUrls: string[] = [seedUrl];
    try {
      const s = await this.fetchText(sitemapUrl);
      if (s.ok) {
        hasSitemap = true;
        for (const u of parseSitemapUrls(s.text, SCAN_PAGE_CAP)) {
          if (!seedUrls.includes(u)) seedUrls.push(u);
        }
      }
    } catch {
      /* ignore */
    }

    try {
      const l = await this.fetchText(llmsUrl);
      hasLlmsTxt = l.ok;
    } catch {
      /* ignore */
    }

    const documents: ResolvedDocument[] = [];
    const seen = new Set<string>();
    const queue = [...seedUrls];

    while (queue.length && documents.length < SCAN_PAGE_CAP) {
      const url = queue.shift()!;
      if (seen.has(url)) continue;
      seen.add(url);

      let pathname = "/";
      try {
        pathname = new URL(url).pathname;
      } catch {
        continue;
      }
      if (isDisallowed(pathname, robots)) continue;

      try {
        const doc = await this.fetchHtml(url);
        if (!doc) continue;
        documents.push(doc);
        const extracted = extractFromHtml(doc.html, url);
        for (const link of extracted.links) {
          if (
            link.internal &&
            !seen.has(link.href) &&
            queue.length + documents.length < SCAN_PAGE_CAP * 2
          ) {
            queue.push(link.href);
          }
        }
      } catch {
        /* skip page */
      }
    }

    return {
      seedUrl,
      documents,
      hasRobots,
      hasSitemap,
      hasLlmsTxt,
      robots,
      meta: { mode: "live_http", pageCap: SCAN_PAGE_CAP },
    };
  }

  private resolveZip(settings: Record<string, unknown>): CrawlBundle {
    const storageKey = String(settings.storage_key ?? "");
    const abs = join(process.cwd(), "storage", "zips", storageKey);
    if (!storageKey || !existsSync(abs)) {
      throw new Error("zip_missing_on_disk");
    }
    const zip = new AdmZip(readFileSync(abs));
    const documents: ResolvedDocument[] = [];
    const entries = zip.getEntries().filter((e) => !e.isDirectory);
    for (const entry of entries) {
      if (documents.length >= SCAN_PAGE_CAP) break;
      const name = entry.entryName.replace(/\\/g, "/");
      if (name.includes("__MACOSX")) continue;
      const lower = name.toLowerCase();
      if (!(lower.endsWith(".html") || lower.endsWith(".htm"))) continue;
      const html = entry.getData().toString("utf8");
      const url = `zip://${name}`;
      documents.push({
        url,
        html,
        httpStatus: 200,
        headers: {},
        bytes: Buffer.byteLength(html),
        source: "zip",
      });
    }

    // If no HTML, synthesize a stub page from package.json for analysis
    if (documents.length === 0) {
      const pkg = entries.find((e) =>
        e.entryName.replace(/\\/g, "/").endsWith("package.json"),
      );
      const body = pkg
        ? `<html><head><title>${String(settings.framework ?? "project")}</title></head><body><h1>ZIP project</h1><pre>${pkg
            .getData()
            .toString("utf8")
            .slice(0, 2000)}</pre></body></html>`
        : `<html><head><title>ZIP project</title></head><body><h1>ZIP upload</h1><p>No HTML files found.</p></body></html>`;
      documents.push({
        url: "zip://index.html",
        html: body,
        httpStatus: 200,
        headers: {},
        bytes: Buffer.byteLength(body),
        source: "zip",
      });
    }

    return {
      seedUrl: "zip://",
      documents,
      hasRobots: false,
      hasSitemap: false,
      hasLlmsTxt: false,
      robots: { fetched: false, disallow: [] },
      meta: {
        mode: "zip",
        framework: settings.framework,
        filename: settings.filename,
      },
    };
  }

  private async resolveGithub(
    repo: string,
    token: string,
  ): Promise<CrawlBundle> {
    const m = repo.match(/([^/]+)\/([^/]+)/);
    if (!m) throw new Error("invalid_github_repo");
    const owner = m[1];
    const name = m[2].replace(/\.git$/, "");
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "AI-Growth-OS",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const treeRes = await fetch(
      `https://api.github.com/repos/${owner}/${name}/git/trees/HEAD?recursive=1`,
      { headers, signal: AbortSignal.timeout(20_000) },
    );
    if (!treeRes.ok) throw new Error("github_tree_failed");
    const treeJson = (await treeRes.json()) as {
      tree?: Array<{ path: string; type: string; url: string }>;
    };
    const files = (treeJson.tree ?? [])
      .filter(
        (t) =>
          t.type === "blob" &&
          /\.(html?|md)$/i.test(t.path) &&
          !t.path.includes("node_modules"),
      )
      .slice(0, SCAN_PAGE_CAP);

    const documents: ResolvedDocument[] = [];
    for (const file of files) {
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${name}/HEAD/${file.path}`;
      try {
        const res = await fetch(rawUrl, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: AbortSignal.timeout(12_000),
        });
        if (!res.ok) continue;
        let text = await res.text();
        if (/\.md$/i.test(file.path)) {
          text = `<html><head><title>${file.path}</title></head><body><pre>${escapeHtml(
            text.slice(0, 50_000),
          )}</pre></body></html>`;
        }
        documents.push({
          url: `github://${owner}/${name}/${file.path}`,
          html: text,
          httpStatus: res.status,
          headers: {},
          bytes: Buffer.byteLength(text),
          source: "github",
        });
      } catch {
        /* skip */
      }
    }

    if (documents.length === 0) {
      const stub = `<html><head><title>${owner}/${name}</title></head><body><h1>${owner}/${name}</h1><p>No HTML/Markdown files found in repository.</p></body></html>`;
      documents.push({
        url: `github://${owner}/${name}`,
        html: stub,
        httpStatus: 200,
        headers: {},
        bytes: Buffer.byteLength(stub),
        source: "github",
      });
    }

    return {
      seedUrl: `https://github.com/${owner}/${name}`,
      documents,
      hasRobots: false,
      hasSitemap: false,
      hasLlmsTxt: false,
      robots: { fetched: false, disallow: [] },
      meta: { mode: "github", owner, repo: name },
    };
  }

  private async fetchText(
    url: string,
  ): Promise<{ ok: boolean; text: string; status: number }> {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(12_000),
      headers: { "User-Agent": "AI-Growth-OS/0.3 (+scanner)" },
      redirect: "follow",
    });
    const text = await res.text();
    return { ok: res.ok, text, status: res.status };
  }

  private async fetchHtml(url: string): Promise<ResolvedDocument | null> {
    const started = Date.now();
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15_000),
      headers: { "User-Agent": "AI-Growth-OS/0.3 (+scanner)" },
      redirect: "follow",
    });
    const ttfbMs = Date.now() - started;
    const contentType = res.headers.get("content-type") ?? "";
    const html = await res.text();
    if (
      !contentType.includes("html") &&
      !html.trimStart().toLowerCase().startsWith("<!doctype") &&
      !html.trimStart().toLowerCase().startsWith("<html")
    ) {
      // still allow if looks like HTML
      if (!/<html/i.test(html) && !/<title/i.test(html)) return null;
    }
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => {
      headers[k.toLowerCase()] = v;
    });
    return {
      url,
      html,
      httpStatus: res.status,
      headers,
      bytes: Buffer.byteLength(html),
      ttfbMs,
      source: "http",
    };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function toExtracted(doc: ResolvedDocument): PageExtracted {
  const base = extractFromHtml(doc.html, doc.url);
  return {
    ...base,
    contentType: doc.headers["content-type"],
    headers: doc.headers,
    bytes: doc.bytes,
    ttfbMs: doc.ttfbMs,
    source: doc.source,
  };
}
