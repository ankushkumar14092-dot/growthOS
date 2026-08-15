import { Injectable, Logger } from "@nestjs/common";
import { parseRepo } from "../connections/github.adapter";

export type GithubPrResult = {
  owner: string;
  repo: string;
  branch: string;
  baseBranch: string;
  prNumber: number;
  prUrl: string;
  commitSha: string;
  /** Primary path verified after apply */
  path: string;
  paths: string[];
};

type FilePut = { path: string; content: string };

@Injectable()
export class GithubPrDeployService {
  private readonly logger = new Logger(GithubPrDeployService.name);

  async openFixPr(opts: {
    repoSetting: string;
    token: string;
    patchId: string;
    proposalType: string;
    beforeValue: string;
    afterValue: string;
    domain: string;
  }): Promise<GithubPrResult> {
    const parsed = parseRepo(opts.repoSetting);
    if (!parsed) throw new Error("invalid_github_repo");

    const { owner, repo } = parsed;
    const headers = {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${opts.token}`,
      "User-Agent": "AI-Growth-OS",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers,
      signal: AbortSignal.timeout(15_000),
    });
    if (!repoRes.ok) {
      throw new Error(`github_repo_inaccessible:${repoRes.status}`);
    }
    const repoBody = (await repoRes.json()) as { default_branch?: string };
    const baseBranch = repoBody.default_branch || "main";

    const refRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(baseBranch)}`,
      { headers, signal: AbortSignal.timeout(15_000) },
    );
    if (!refRes.ok) {
      throw new Error(`github_ref_missing:${baseBranch}`);
    }
    const refBody = (await refRes.json()) as { object?: { sha?: string } };
    const baseSha = refBody.object?.sha;
    if (!baseSha) throw new Error("github_base_sha_missing");

    const branch = `ai-growth-os/fix-${opts.patchId.slice(0, 8)}`;
    const createRef = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/refs`,
      {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          ref: `refs/heads/${branch}`,
          sha: baseSha,
        }),
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!createRef.ok && createRef.status !== 422) {
      const t = await createRef.text();
      this.logger.warn(`create ref failed: ${createRef.status} ${t}`);
      throw new Error(`github_branch_create_failed:${createRef.status}`);
    }

    const files = this.buildRealWorldFiles(opts);
    let commitSha = "";
    for (const file of files) {
      const sha = await this.putFile({
        owner,
        repo,
        branch,
        headers,
        path: file.path,
        content: file.content,
        message: `fix(${opts.proposalType}): ${file.path}`,
      });
      if (sha) commitSha = sha;
    }

    const primary = files[0]!;
    const pathList = files.map((f) => f.path).join(", ");

    const prRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls`,
      {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `AI Growth OS: ${opts.proposalType} → live SEO/AEO/GEO for ${opts.domain}`,
          head: branch,
          base: baseBranch,
          body: [
            `## Real-world apply (SEO · AEO · GEO · AI-visibility)`,
            ``,
            `This PR writes **site files** (not only a markdown note) so after you **merge** (and Vercel/host redeploys), crawlers can see the change.`,
            ``,
            `**Type:** \`${opts.proposalType}\``,
            `**Files:** ${pathList}`,
            ``,
            `### After (applied value)`,
            "```",
            opts.afterValue.slice(0, 2000),
            "```",
            ``,
            `### How it shows on the live page`,
            this.liveImpactHelp(opts.proposalType),
            ``,
            `### Next.js (title / meta / OG / FAQ)`,
            `If this repo is Next.js App Router, import generated metadata:`,
            "```ts",
            `// app/layout.tsx`,
            `import { aigosMetadata } from "../ai-growth-os/metadata";`,
            `export const metadata = { ...aigosMetadata };`,
            "```",
            `Or paste \`ai-growth-os/head-snippet.html\` into your root layout \`<head>\`.`,
            ``,
            `Rollback (unmerged): close this PR.`,
          ].join("\n"),
        }),
        signal: AbortSignal.timeout(20_000),
      },
    );

    if (prRes.status === 422) {
      const list = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/pulls?head=${owner}:${branch}&state=open`,
        { headers, signal: AbortSignal.timeout(15_000) },
      );
      const arr = (await list.json()) as Array<{
        number: number;
        html_url: string;
      }>;
      if (arr[0]) {
        return {
          owner,
          repo,
          branch,
          baseBranch,
          prNumber: arr[0].number,
          prUrl: arr[0].html_url,
          commitSha,
          path: primary.path,
          paths: files.map((f) => f.path),
        };
      }
    }

    if (!prRes.ok) {
      const t = await prRes.text();
      this.logger.warn(`create PR failed: ${prRes.status} ${t}`);
      throw new Error(`github_pr_failed:${prRes.status}`);
    }
    const prBody = (await prRes.json()) as {
      number: number;
      html_url: string;
    };

    return {
      owner,
      repo,
      branch,
      baseBranch,
      prNumber: prBody.number,
      prUrl: prBody.html_url,
      commitSha,
      path: primary.path,
      paths: files.map((f) => f.path),
    };
  }

  async closePr(opts: {
    owner: string;
    repo: string;
    prNumber: number;
    token: string;
  }): Promise<void> {
    const headers = {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${opts.token}`,
      "User-Agent": "AI-Growth-OS",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    };
    const res = await fetch(
      `https://api.github.com/repos/${opts.owner}/${opts.repo}/pulls/${opts.prNumber}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({ state: "closed" }),
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!res.ok) {
      throw new Error(`github_pr_close_failed:${res.status}`);
    }
  }

  async verifyPr(opts: {
    owner: string;
    repo: string;
    prNumber: number;
    token: string;
    afterValue: string;
    path: string;
  }): Promise<{
    pass: boolean;
    state: string;
    checks: Array<{ name: string; pass: boolean; detail?: string }>;
  }> {
    const headers = {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${opts.token}`,
      "User-Agent": "AI-Growth-OS",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    const prRes = await fetch(
      `https://api.github.com/repos/${opts.owner}/${opts.repo}/pulls/${opts.prNumber}`,
      { headers, signal: AbortSignal.timeout(15_000) },
    );
    if (!prRes.ok) {
      return {
        pass: false,
        state: "missing",
        checks: [{ name: "pr_exists", pass: false, detail: String(prRes.status) }],
      };
    }
    const pr = (await prRes.json()) as { state: string; head?: { ref?: string } };
    const openOk = pr.state === "open" || pr.state === "closed";

    const fileRes = await fetch(
      `https://api.github.com/repos/${opts.owner}/${opts.repo}/contents/${opts.path}?ref=${encodeURIComponent(pr.head?.ref || "")}`,
      { headers, signal: AbortSignal.timeout(15_000) },
    );
    let contentOk = false;
    if (fileRes.ok) {
      const file = (await fileRes.json()) as { content?: string; encoding?: string };
      if (file.content) {
        const raw = Buffer.from(file.content.replace(/\n/g, ""), "base64").toString(
          "utf8",
        );
        const needle = opts.afterValue.trim().slice(0, 120);
        contentOk = needle.length === 0 || raw.includes(needle);
      }
    }

    return {
      pass: openOk && contentOk,
      state: pr.state,
      checks: [
        { name: "pr_exists", pass: openOk, detail: pr.state },
        {
          name: "real_file_contains_after",
          pass: contentOk,
          detail: opts.path,
        },
      ],
    };
  }

  /** Files that become live URLs / head tags after merge + host redeploy. */
  buildRealWorldFiles(opts: {
    proposalType: string;
    beforeValue: string;
    afterValue: string;
    domain: string;
    patchId: string;
  }): FilePut[] {
    const after = opts.afterValue;
    const type = opts.proposalType;
    const files: FilePut[] = [];

    if (type === "llms_txt") {
      files.push({ path: "public/llms.txt", content: ensureTrailingNewline(after) });
      files.push({
        path: "ai-growth-os/README.md",
        content: `# Applied: llms.txt\n\nLive URL after deploy: \`https://${opts.domain}/llms.txt\`\n`,
      });
      return files;
    }
    if (type === "robots_txt") {
      files.push({ path: "public/robots.txt", content: ensureTrailingNewline(after) });
      files.push({
        path: "ai-growth-os/README.md",
        content: `# Applied: robots.txt\n\nLive URL after deploy: \`https://${opts.domain}/robots.txt\`\n`,
      });
      return files;
    }
    if (type === "sitemap_xml") {
      files.push({ path: "public/sitemap.xml", content: ensureTrailingNewline(after) });
      files.push({
        path: "ai-growth-os/README.md",
        content: `# Applied: sitemap.xml\n\nLive URL after deploy: \`https://${opts.domain}/sitemap.xml\`\n`,
      });
      return files;
    }

    // Head / schema signals → JSON + HTML snippet + Next metadata helper
    const seoJson = {
      domain: opts.domain,
      patchId: opts.patchId,
      proposalType: type,
      before: opts.beforeValue,
      after,
      updatedAt: new Date().toISOString(),
    };
    files.push({
      path: "ai-growth-os/seo.json",
      content: `${JSON.stringify(seoJson, null, 2)}\n`,
    });
    files.push({
      path: "ai-growth-os/head-snippet.html",
      content: this.buildHeadSnippet(type, after, opts.domain),
    });
    files.push({
      path: "ai-growth-os/metadata.ts",
      content: this.buildNextMetadataTs(type, after, opts.domain),
    });
    files.push({
      path: "ai-growth-os/README.md",
      content: [
        `# Applied: ${type}`,
        ``,
        `Merge this PR, let the host redeploy, then wire head tags:`,
        ``,
        `1. Paste \`head-snippet.html\` into your root \`<head>\`, **or**`,
        `2. Next.js: \`import { aigosMetadata } from "../ai-growth-os/metadata"\` in \`app/layout.tsx\`.`,
        ``,
        `Until the layout imports metadata / snippet, only \`public/*\` file fixes appear automatically.`,
        ``,
      ].join("\n"),
    });
    return files;
  }

  private liveImpactHelp(proposalType: string): string {
    switch (proposalType) {
      case "llms_txt":
        return `- After merge + deploy: **https://YOUR_DOMAIN/llms.txt** (GEO / AI crawlers)`;
      case "robots_txt":
        return `- After merge + deploy: **https://YOUR_DOMAIN/robots.txt** (SEO)`;
      case "sitemap_xml":
        return `- After merge + deploy: **https://YOUR_DOMAIN/sitemap.xml** (SEO)`;
      case "meta_title":
      case "meta_description":
      case "canonical":
      case "open_graph":
      case "faq_schema":
        return `- After merge: import \`ai-growth-os/metadata.ts\` (or paste \`head-snippet.html\`) so HTML \`<head>\` updates on the real page (SEO / AEO / GEO).`;
      default:
        return `- Merge and follow \`ai-growth-os/README.md\`.`;
    }
  }

  private buildHeadSnippet(
    proposalType: string,
    after: string,
    domain: string,
  ): string {
    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
    if (proposalType === "meta_title") {
      return `<!-- AI Growth OS: meta_title -->\n<title>${esc(after)}</title>\n`;
    }
    if (proposalType === "meta_description") {
      return `<!-- AI Growth OS: meta_description -->\n<meta name="description" content="${esc(after)}" />\n`;
    }
    if (proposalType === "canonical") {
      return `<!-- AI Growth OS: canonical -->\n<link rel="canonical" href="${esc(after)}" />\n`;
    }
    if (proposalType === "open_graph") {
      return `<!-- AI Growth OS: open_graph -->\n${after.trim()}\n`;
    }
    if (proposalType === "faq_schema") {
      return `<!-- AI Growth OS: faq_schema -->\n<script type="application/ld+json">${after.trim()}</script>\n`;
    }
    return `<!-- AI Growth OS (${proposalType}) for ${domain} -->\n${after}\n`;
  }

  private buildNextMetadataTs(
    proposalType: string,
    after: string,
    domain: string,
  ): string {
    const q = (s: string) => JSON.stringify(s);
    const lines = [
      `/** Generated by AI Growth OS — merge into app/layout.tsx metadata */`,
      `export const aigosMetadata: Record<string, unknown> = {`,
    ];
    if (proposalType === "meta_title") {
      lines.push(`  title: ${q(after)},`);
    } else if (proposalType === "meta_description") {
      lines.push(`  description: ${q(after)},`);
    } else if (proposalType === "canonical") {
      lines.push(`  alternates: { canonical: ${q(after)} },`);
    } else if (proposalType === "open_graph") {
      lines.push(`  // Open Graph tags also in head-snippet.html`);
      lines.push(`  openGraph: { url: ${q(`https://${domain}`)} },`);
    } else if (proposalType === "faq_schema") {
      lines.push(`  // FAQ JSON-LD is in head-snippet.html (not Metadata API)`);
      lines.push(`  other: { "aigos-faq": "see head-snippet.html" },`);
    } else {
      lines.push(`  // ${proposalType}`);
    }
    lines.push(`};`);
    lines.push(``);
    lines.push(`export default aigosMetadata;`);
    lines.push(``);
    return lines.join("\n");
  }

  private async putFile(opts: {
    owner: string;
    repo: string;
    branch: string;
    headers: Record<string, string>;
    path: string;
    content: string;
    message: string;
  }): Promise<string> {
    const { owner, repo, branch, headers, path, content, message } = opts;
    let existingSha: string | undefined;
    const getRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`,
      { headers, signal: AbortSignal.timeout(15_000) },
    );
    if (getRes.ok) {
      const body = (await getRes.json()) as { sha?: string };
      existingSha = body.sha;
    }

    const putRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          content: Buffer.from(content, "utf8").toString("base64"),
          branch,
          ...(existingSha ? { sha: existingSha } : {}),
        }),
        signal: AbortSignal.timeout(20_000),
      },
    );
    if (!putRes.ok) {
      const t = await putRes.text();
      this.logger.warn(`put ${path} failed: ${putRes.status} ${t}`);
      throw new Error(`github_commit_failed:${path}:${putRes.status}`);
    }
    const putBody = (await putRes.json()) as {
      commit?: { sha?: string };
      content?: { sha?: string };
    };
    return putBody.commit?.sha || putBody.content?.sha || "";
  }
}

function ensureTrailingNewline(s: string): string {
  return s.endsWith("\n") ? s : `${s}\n`;
}
