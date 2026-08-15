import { Injectable } from "@nestjs/common";
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from "fs";
import { join } from "path";

export type FixPack = {
  mode: "zip_artifact" | "url_guide";
  patchId: string;
  domain: string;
  proposalType: string;
  beforeValue: string;
  afterValue: string;
  instructions: string[];
  createdAt: string;
  artifactPath?: string;
};

@Injectable()
export class ArtifactDeployService {
  private dir() {
    const d = join(process.cwd(), "storage", "deploy-artifacts");
    if (!existsSync(d)) mkdirSync(d, { recursive: true });
    return d;
  }

  buildPack(opts: {
    mode: "zip_artifact" | "url_guide";
    patchId: string;
    domain: string;
    proposalType: string;
    beforeValue: string;
    afterValue: string;
  }): FixPack {
    const fileHint =
      opts.proposalType === "llms_txt"
        ? "Create /llms.txt at the site root with the After content."
        : opts.proposalType === "robots_txt"
          ? "Create /robots.txt at the site root with the After content."
          : opts.proposalType === "sitemap_xml"
            ? "Create /sitemap.xml at the site root with the After content."
            : opts.proposalType === "open_graph"
              ? "Add the After Open Graph meta tags to your page <head>."
              : null;

    const instructions =
      opts.mode === "zip_artifact"
        ? [
            "Download / open this fix pack from the deployment detail.",
            fileHint ??
              `Set ${opts.proposalType} from the Before value to the After value in your project files.`,
            "Re-zip and redeploy your site with your usual host pipeline.",
            "Re-scan in AI Growth OS to confirm the issue is gone.",
          ]
        : [
            "This Live URL deploy cannot write to your host (Vercel/Netlify/etc.).",
            fileHint ??
              `Manually set ${opts.proposalType} on ${opts.domain} to the After value.`,
            "Use your CMS, framework meta tags, or hosting SEO settings.",
            "Re-run Deploy or Scan — verification rechecks live HTML.",
          ];

    return {
      mode: opts.mode,
      patchId: opts.patchId,
      domain: opts.domain,
      proposalType: opts.proposalType,
      beforeValue: opts.beforeValue,
      afterValue: opts.afterValue,
      instructions,
      createdAt: new Date().toISOString(),
    };
  }

  writeToDisk(deploymentId: string, pack: FixPack): string {
    const filename = `${deploymentId}.json`;
    const abs = join(this.dir(), filename);
    writeFileSync(abs, JSON.stringify(pack, null, 2), "utf8");
    const md = join(this.dir(), `${deploymentId}.md`);
    writeFileSync(
      md,
      [
        `# Fix pack — ${pack.domain}`,
        ``,
        `Mode: ${pack.mode}`,
        `Type: ${pack.proposalType}`,
        `Patch: ${pack.patchId}`,
        ``,
        `## Before`,
        "```",
        pack.beforeValue || "(empty)",
        "```",
        ``,
        `## After`,
        "```",
        pack.afterValue,
        "```",
        ``,
        `## Instructions`,
        ...pack.instructions.map((i) => `- ${i}`),
        ``,
      ].join("\n"),
      "utf8",
    );
    return `storage/deploy-artifacts/${filename}`;
  }

  removeFromDisk(deploymentId: string): void {
    for (const ext of ["json", "md"]) {
      const abs = join(this.dir(), `${deploymentId}.${ext}`);
      if (existsSync(abs)) unlinkSync(abs);
    }
  }
}
