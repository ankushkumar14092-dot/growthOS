import { Injectable } from "@nestjs/common";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import {
  ConnectionAdapter,
  SiteConnectionContext,
  VerifyResult,
  nowIso,
} from "./types";

export type DetectedFramework =
  | "nextjs"
  | "react"
  | "astro"
  | "vue"
  | "nuxt"
  | "laravel"
  | "wordpress"
  | "static"
  | "unknown";

export function detectFrameworkFromTree(rootFiles: string[]): DetectedFramework {
  const set = new Set(rootFiles.map((f) => f.toLowerCase()));
  if (set.has("wp-config.php") || set.has("wp-config-sample.php")) {
    return "wordpress";
  }
  if (set.has("composer.json") && set.has("artisan")) return "laravel";
  if (set.has("astro.config.mjs") || set.has("astro.config.ts")) return "astro";
  if (set.has("nuxt.config.ts") || set.has("nuxt.config.js")) return "nuxt";
  if (set.has("next.config.js") || set.has("next.config.mjs") || set.has("next.config.ts")) {
    return "nextjs";
  }
  if (set.has("package.json")) {
    try {
      // caller may enrich; default react-ish
      return "react";
    } catch {
      return "unknown";
    }
  }
  if (set.has("index.html")) return "static";
  return "unknown";
}

export function detectFrameworkFromPackageJson(pkgRaw: string): DetectedFramework {
  try {
    const pkg = JSON.parse(pkgRaw) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps.next) return "nextjs";
    if (deps.nuxt) return "nuxt";
    if (deps.astro) return "astro";
    if (deps.vue || deps.nuxt) return deps.nuxt ? "nuxt" : "vue";
    if (deps.react) return "react";
  } catch {
    /* ignore */
  }
  return "unknown";
}

@Injectable()
export class ZipAdapter implements ConnectionAdapter {
  readonly type = "zip" as const;

  async verify(ctx: SiteConnectionContext): Promise<VerifyResult> {
    const storageKey =
      typeof ctx.settings.storage_key === "string"
        ? ctx.settings.storage_key
        : typeof ctx.credential?.meta.storage_key === "string"
          ? (ctx.credential.meta.storage_key as string)
          : null;

    if (!storageKey) {
      return {
        ok: false,
        status: "disconnected",
        error: "no_zip_uploaded",
        checkedAt: nowIso(),
      };
    }

    const abs = join(process.cwd(), "storage", "zips", storageKey);
    if (!existsSync(abs)) {
      return {
        ok: false,
        status: "unhealthy",
        error: "zip_missing_on_disk",
        details: { storageKey },
        checkedAt: nowIso(),
      };
    }

    const framework =
      (typeof ctx.settings.framework === "string" && ctx.settings.framework) ||
      "unknown";

    // Touch file to confirm readable
    try {
      readFileSync(abs, { encoding: null, flag: "r" });
    } catch {
      return {
        ok: false,
        status: "unhealthy",
        error: "zip_unreadable",
        checkedAt: nowIso(),
      };
    }

    return {
      ok: true,
      status: "healthy",
      details: {
        storageKey,
        framework,
        filename: ctx.settings.filename,
        mode: "zip_analyze_download",
      },
      checkedAt: nowIso(),
    };
  }
}
