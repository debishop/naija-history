import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  APPROVED_SOURCES,
  SOURCE_CATEGORIES,
  getSourcesByCategory,
  getSourcesByPriority,
  getFeedSources,
  getScrapeSources,
} from "./source-whitelist.js";

describe("Source Whitelist", () => {
  it("contains at least 25 approved sources", () => {
    assert.ok(APPROVED_SOURCES.length >= 25, `Expected 25+ sources, got ${APPROVED_SOURCES.length}`);
  });

  it("every source has required fields", () => {
    for (const source of APPROVED_SOURCES) {
      assert.ok(source.id, `Source missing id`);
      assert.ok(source.name, `Source ${source.id} missing name`);
      assert.ok(source.url, `Source ${source.id} missing url`);
      assert.ok(source.category, `Source ${source.id} missing category`);
      assert.ok(typeof source.priority === "number", `Source ${source.id} missing priority`);
    }
  });

  it("every source category is valid", () => {
    const validCategories = Object.keys(SOURCE_CATEGORIES);
    for (const source of APPROVED_SOURCES) {
      assert.ok(validCategories.includes(source.category), `Source ${source.id} has invalid category: ${source.category}`);
    }
  });

  it("source IDs are unique", () => {
    const ids = APPROVED_SOURCES.map((s) => s.id);
    const unique = new Set(ids);
    assert.equal(ids.length, unique.size, "Duplicate source IDs found");
  });

  it("getSourcesByCategory returns correct sources", () => {
    const news = getSourcesByCategory("news");
    assert.ok(news.length > 0, "Should have news sources");
    for (const s of news) {
      assert.equal(s.category, "news");
    }
  });

  it("getSourcesByPriority filters by max priority", () => {
    const top = getSourcesByPriority(1);
    assert.ok(top.length > 0, "Should have priority-1 sources");
    for (const s of top) {
      assert.ok(s.priority <= 1);
    }
  });

  it("getFeedSources returns only sources with feedUrl", () => {
    const feeds = getFeedSources();
    assert.ok(feeds.length > 0);
    for (const s of feeds) {
      assert.ok(s.feedUrl !== null, `Source ${s.id} has null feedUrl`);
    }
  });

  it("getScrapeSources returns only sources with scrapeSelectors", () => {
    const scrapers = getScrapeSources();
    assert.ok(scrapers.length > 0);
    for (const s of scrapers) {
      assert.ok(s.scrapeSelectors !== null, `Source ${s.id} has null scrapeSelectors`);
    }
  });
});
