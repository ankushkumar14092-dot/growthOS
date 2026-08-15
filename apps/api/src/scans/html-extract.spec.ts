import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractFromHtml } from "./html-extract";
import { auditPage, auditSiteLevel } from "./auditors";
import { parseRobotsTxt, parseSitemapUrls, isDisallowed } from "./robots-sitemap";

describe("extractFromHtml", () => {
  it("extracts title meta h1 canonical and links", () => {
    const html = `<!doctype html><html><head>
      <title>Hello</title>
      <meta name="description" content="Desc">
      <link rel="canonical" href="https://ex.com/">
      <meta property="og:title" content="OG">
      <script type="application/ld+json">{"@type":"WebSite"}</script>
    </head><body>
      <h1>Main</h1>
      <img src="/a.png" alt="">
      <a href="/about">About</a>
      <a href="https://other.com">Ext</a>
    </body></html>`;
    const ex = extractFromHtml(html, "https://ex.com/");
    assert.equal(ex.title, "Hello");
    assert.equal(ex.metaDescription, "Desc");
    assert.equal(ex.canonical, "https://ex.com/");
    assert.deepEqual(ex.h1, ["Main"]);
    assert.equal(ex.og["og:title"], "OG");
    assert.equal(ex.jsonLd.length, 1);
    assert.equal(ex.images[0].alt, "");
    assert.equal(ex.links.filter((l) => l.internal).length, 1);
    assert.equal(ex.hasViewport, false);
  });

  it("detects viewport meta",
    () => {
      const html = `<html><head><meta name="viewport" content="width=device-width"><title>T</title></head><body><h1>H</h1></body></html>`;
      const ex = extractFromHtml(html, "https://ex.com/");
      assert.equal(ex.hasViewport, true);
    },
  );
});

describe("robots-sitemap", () => {
  it("parses disallow and sitemap locs", () => {
    const robots = parseRobotsTxt(`User-agent: *\nDisallow: /private\n`);
    assert.equal(isDisallowed("/private/x", robots), true);
    assert.equal(isDisallowed("/public", robots), false);
    const urls = parseSitemapUrls(
      `<urlset><url><loc>https://a.com/1</loc></url><url><loc>https://a.com/2</loc></url></urlset>`,
    );
    assert.deepEqual(urls, ["https://a.com/1", "https://a.com/2"]);
  });
});

describe("auditors", () => {
  it("flags missing title and site-level gaps", () => {
    const pageIssues = auditPage(
      "https://ex.com/",
      {
        title: null,
        metaDescription: "x",
        metaRobots: null,
        canonical: "https://ex.com/",
        h1: ["H"],
        h2: [],
        h3: [],
        og: { "og:title": "T" },
        jsonLd: [{}],
        images: [],
        links: [
          { href: "/a", internal: true },
          { href: "/b", internal: true },
        ],
        scriptCount: 0,
        stylesheetCount: 0,
        textLength: 500,
        hasViewport: true,
        ttfbMs: 200,
        source: "http",
        headers: {
          "strict-transport-security": "1",
          "x-frame-options": "DENY",
          "content-security-policy": "default-src 'self'",
        },
      },
      200,
    );
    assert.ok(pageIssues.some((i) => i.issueType === "missing_title"));
    assert.ok(!pageIssues.some((i) => i.issueType === "missing_viewport"));
    assert.ok(!pageIssues.some((i) => i.issueType === "missing_open_graph"));
    const site = auditSiteLevel({
      seedUrl: "http://ex.com",
      hasRobots: false,
      hasSitemap: false,
      hasLlmsTxt: false,
    });
    assert.ok(site.some((i) => i.issueType === "https_required"));
    assert.ok(site.some((i) => i.issueType === "no_sitemap"));
  });
});
