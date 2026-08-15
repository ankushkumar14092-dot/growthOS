import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildRuleProposal,
  changeClassFor,
  confidenceFor,
  issueToProposalType,
} from "./proposal-engine";

describe("proposal-engine", () => {
  it("maps issues to proposal types", () => {
    assert.equal(issueToProposalType("missing_title"), "meta_title");
    assert.equal(issueToProposalType("missing_open_graph"), "open_graph");
    assert.equal(issueToProposalType("no_llms_txt"), "llms_txt");
    assert.equal(issueToProposalType("no_robots"), "robots_txt");
    assert.equal(issueToProposalType("no_sitemap"), "sitemap_xml");
    assert.equal(issueToProposalType("missing_meta_description"), "meta_description");
    assert.equal(issueToProposalType("no_schema"), "faq_schema");
    assert.equal(issueToProposalType("missing_canonical"), "canonical");
    assert.equal(issueToProposalType("missing_h1"), null);
  });

  it("assigns server-side confidence and change_class", () => {
    assert.equal(
      confidenceFor({
        proposalType: "meta_title",
        source: "rule",
        beforeEmpty: true,
      }),
      100,
    );
    assert.equal(
      changeClassFor({ proposalType: "meta_title", beforeEmpty: true }),
      "safe",
    );
    assert.equal(
      changeClassFor({ proposalType: "faq_schema", beforeEmpty: true }),
      "approve",
    );
  });

  it("builds understandable rule proposals", () => {
    const p = buildRuleProposal({
      proposalType: "meta_description",
      beforeValue: "",
      domain: "example.com",
      pageUrl: "https://example.com/",
    });
    assert.equal(p.source, "rule");
    assert.ok(p.afterValue.length > 20);
    assert.ok(p.businessImpact.length > 10);
    assert.ok(p.reasoning.length > 10);
    assert.equal(p.changeClass, "safe");
    assert.equal(p.confidence, 100);
  });
});
