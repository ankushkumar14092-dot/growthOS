import { verifyDeployment } from "./verify-engine";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("verifyDeployment", () => {
  it("passes meta title when title matches", () => {
    const html = `<html><head><title>AI Growth Title</title></head><body></body></html>`;
    const result = verifyDeployment({
      proposalType: "meta_title",
      afterValue: "AI Growth Title",
      html,
      pageReachable: true,
    });
    assert.equal(result.pass, true);
  });

  it("fails meta title on mismatch", () => {
    const html = `<html><head><title>Old</title></head><body></body></html>`;
    const result = verifyDeployment({
      proposalType: "meta_title",
      afterValue: "New Title",
      html,
      pageReachable: true,
    });
    assert.equal(result.pass, false);
    assert.ok(result.checks.some((c) => c.name === "title_matches" && !c.pass));
  });

  it("passes meta description", () => {
    const html = `<html><head><meta name="description" content="Hello world desc" /></head><body></body></html>`;
    const result = verifyDeployment({
      proposalType: "meta_description",
      afterValue: "Hello world desc",
      html,
      pageReachable: true,
    });
    assert.equal(result.pass, true);
  });

  it("passes FAQ schema when FAQPage present", () => {
    const faq = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is Growth OS?",
          acceptedAnswer: { "@type": "Answer", text: "An AI ops platform." },
        },
      ],
    });
    const html = `<html><head><script type="application/ld+json">${faq}</script></head><body></body></html>`;
    const result = verifyDeployment({
      proposalType: "faq_schema",
      afterValue: faq,
      html,
      pageReachable: true,
    });
    assert.equal(result.pass, true);
  });

  it("passes canonical when link matches", () => {
    const result = verifyDeployment({
      proposalType: "canonical",
      afterValue: "https://example.com/about",
      html: `<html><head><link rel="canonical" href="https://example.com/about" /></head><body></body></html>`,
      pageReachable: true,
    });
    assert.equal(result.pass, true);
  });

  it("fails when FORCE_VERIFY_FAIL / forceFail", () => {
    const html = `<html><head><title>AI Growth Title</title></head><body></body></html>`;
    const result = verifyDeployment({
      proposalType: "meta_title",
      afterValue: "AI Growth Title",
      html,
      pageReachable: true,
      forceFail: true,
    });
    assert.equal(result.pass, false);
  });

  it("fails when page unreachable", () => {
    const result = verifyDeployment({
      proposalType: "meta_title",
      afterValue: "X",
      html: "",
      pageReachable: false,
    });
    assert.equal(result.pass, false);
  });
});
