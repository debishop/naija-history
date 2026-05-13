import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { IdeaValidator, EMOTION_LEXICON, HOOK_PATTERNS, AUDIENCE_SEGMENTS } from "./idea-validator.js";

const STRONG_LEAD = {
  title: "The Untold Story of the Benin Kingdom: What You Never Knew",
  description: "The forgotten history of one of Nigeria's greatest kingdoms, its proud legacy, and the shocking betrayal by colonial forces that destroyed centuries of cultural heritage.",
  sourceName: "BBC Nigeria",
  link: "https://example.com/benin",
  pubDate: new Date().toISOString(),
};

const WEAK_LEAD = {
  title: "Local event this weekend",
  description: "A community gathering will be held at the local park.",
  sourceName: "Local News",
  link: "https://example.com/event",
  pubDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
};

const MEDIUM_LEAD = {
  title: "Lagos Economy Shows Growth After Oil Discovery",
  description: "Nigeria's economic hub continues to develop as new trade opportunities emerge.",
  sourceName: "Nairametrics",
  link: "https://example.com/lagos",
  pubDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
};

describe("IdeaValidator", () => {
  it("validates a single idea with all scoring dimensions", () => {
    const validator = new IdeaValidator();
    const result = validator.validateIdea(STRONG_LEAD);

    assert.ok(result.finalScore >= 0 && result.finalScore <= 10);
    assert.ok(result.grade);
    assert.ok(result.breakdown);
    assert.ok(result.breakdown.virality);
    assert.ok(result.breakdown.emotion);
    assert.ok(result.breakdown.hook);
    assert.ok(result.breakdown.audience);
    assert.ok(result.breakdown.saturation);
    assert.ok(typeof result.breakdown.timingBonus === "number");
    assert.ok(result.recommendation);
  });

  it("scores strong leads higher than weak leads", () => {
    const validator = new IdeaValidator();
    const strong = validator.validateIdea(STRONG_LEAD);
    const weak = validator.validateIdea(WEAK_LEAD);

    assert.ok(strong.finalScore > weak.finalScore, `Strong (${strong.finalScore}) should beat weak (${weak.finalScore})`);
  });

  it("detects emotions in content", () => {
    const validator = new IdeaValidator();
    const result = validator.validateIdea(STRONG_LEAD);

    assert.ok(Object.keys(result.breakdown.emotion.detected).length > 0, "Should detect emotions");
    assert.ok(result.breakdown.emotion.dominantEmotion, "Should identify dominant emotion");
  });

  it("detects hook patterns", () => {
    const validator = new IdeaValidator();
    const result = validator.validateIdea(STRONG_LEAD);

    assert.ok(result.breakdown.hook.hasStrongHook, "Strong lead should have a strong hook");
    assert.ok(result.breakdown.hook.matchedPatterns.length > 0, "Should match hook patterns");
  });

  it("penalizes saturated content via recent titles", () => {
    const validator = new IdeaValidator({
      recentTitles: ["The Untold Story of the Benin Kingdom"],
    });
    const result = validator.validateIdea(STRONG_LEAD);

    assert.ok(result.breakdown.saturation.overlapRatio > 0, "Should detect overlap with recent titles");
    assert.ok(result.breakdown.saturation.score < 10, "Score should be reduced for saturated content");
  });

  it("gives full freshness score when no overlap", () => {
    const validator = new IdeaValidator({ recentTitles: [] });
    const result = validator.validateIdea(STRONG_LEAD);

    assert.equal(result.breakdown.saturation.overlapRatio, 0);
    assert.equal(result.breakdown.saturation.score, 10);
  });

  it("validates a batch and sorts by score", () => {
    const validator = new IdeaValidator();
    const results = validator.validateBatch([WEAK_LEAD, STRONG_LEAD, MEDIUM_LEAD]);

    assert.equal(results.length, 3);
    for (let i = 1; i < results.length; i++) {
      assert.ok(results[i - 1].finalScore >= results[i].finalScore);
    }
  });

  it("getTopIdeas filters out skip-grade leads", () => {
    const validator = new IdeaValidator();
    const top = validator.getTopIdeas([STRONG_LEAD, WEAK_LEAD, MEDIUM_LEAD], 10);

    for (const idea of top) {
      assert.notEqual(idea.grade, "skip");
    }
  });

  it("assigns correct grades", () => {
    const validator = new IdeaValidator();
    const strong = validator.validateIdea(STRONG_LEAD);
    const weak = validator.validateIdea(WEAK_LEAD);

    assert.ok(["publish-now", "strong-candidate"].includes(strong.grade), `Expected strong grade, got ${strong.grade}`);
    assert.ok(["low-priority", "skip", "needs-work"].includes(weak.grade), `Expected weak grade, got ${weak.grade}`);
  });

  it("includes recommendation text", () => {
    const validator = new IdeaValidator();
    const result = validator.validateIdea(STRONG_LEAD);

    assert.ok(result.recommendation.length > 0);
  });

  it("gives timing bonus for recent content", () => {
    const validator = new IdeaValidator();
    const recent = validator.validateIdea({ ...MEDIUM_LEAD, pubDate: new Date().toISOString() });
    const old = validator.validateIdea({ ...MEDIUM_LEAD, pubDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString() });

    assert.ok(recent.breakdown.timingBonus > old.breakdown.timingBonus);
  });
});

describe("Scoring constants", () => {
  it("EMOTION_LEXICON covers multiple emotions", () => {
    assert.ok(Object.keys(EMOTION_LEXICON).length >= 5);
  });

  it("HOOK_PATTERNS has multiple patterns", () => {
    assert.ok(HOOK_PATTERNS.length >= 5);
  });

  it("AUDIENCE_SEGMENTS covers multiple segments", () => {
    assert.ok(Object.keys(AUDIENCE_SEGMENTS).length >= 3);
  });
});
