import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GithubPrDeployService } from "./github-pr-deploy.service";

describe("GithubPrDeployService real-world files", () => {
  const svc = new GithubPrDeployService();

  it("writes public/llms.txt for GEO", () => {
    const files = svc.buildRealWorldFiles({
      proposalType: "llms_txt",
      beforeValue: "",
      afterValue: "# vibdocs\n",
      domain: "vibdocs.vercel.app",
      patchId: "p1",
    });
    assert.ok(files.some((f) => f.path === "public/llms.txt"));
    assert.match(files[0]!.content, /vibdocs/);
  });

  it("writes public robots + sitemap", () => {
    const robots = svc.buildRealWorldFiles({
      proposalType: "robots_txt",
      beforeValue: "",
      afterValue: "User-agent: *\nAllow: /\n",
      domain: "example.com",
      patchId: "p2",
    });
    assert.ok(robots.some((f) => f.path === "public/robots.txt"));
    const sm = svc.buildRealWorldFiles({
      proposalType: "sitemap_xml",
      beforeValue: "",
      afterValue: "<urlset></urlset>",
      domain: "example.com",
      patchId: "p3",
    });
    assert.ok(sm.some((f) => f.path === "public/sitemap.xml"));
  });

  it("writes head snippet + metadata for title/OG/FAQ", () => {
    const files = svc.buildRealWorldFiles({
      proposalType: "meta_title",
      beforeValue: "",
      afterValue: "Hello Title",
      domain: "example.com",
      patchId: "p4",
    });
    assert.ok(files.some((f) => f.path === "ai-growth-os/head-snippet.html"));
    assert.ok(files.some((f) => f.path === "ai-growth-os/metadata.ts"));
    assert.ok(files.some((f) => f.path === "ai-growth-os/seo.json"));
  });
});
