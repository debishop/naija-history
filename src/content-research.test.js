import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ContentResearchPipeline, NIGERIA_KEYWORDS, HISTORY_KEYWORDS, VIRAL_HOOKS } from "./content-research.js";

const MOCK_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>Test Feed</title>
  <item>
    <title>The Forgotten Kingdom of Benin: How Nigeria Lost Its Greatest Treasures</title>
    <link>https://example.com/benin-kingdom</link>
    <description>The untold story of the Benin Bronzes and the British punitive expedition of 1897 that destroyed one of Africa's greatest kingdoms.</description>
    <pubDate>Mon, 12 May 2026 10:00:00 GMT</pubDate>
    <category>History</category>
  </item>
  <item>
    <title>New Restaurant Opens Downtown</title>
    <link>https://example.com/restaurant</link>
    <description>A new Italian restaurant opened on Main Street today.</description>
    <pubDate>Mon, 12 May 2026 09:00:00 GMT</pubDate>
    <category>Food</category>
  </item>
  <item>
    <title>Lagos Economy Surges Amid Oil Production Boom</title>
    <link>https://example.com/lagos-economy</link>
    <description>Nigeria's largest city sees unprecedented economic growth as oil production reaches new highs.</description>
    <pubDate>Sun, 11 May 2026 08:00:00 GMT</pubDate>
    <category>Economy</category>
  </item>
  <item>
    <title><![CDATA[Queen Amina of Zazzau: The Warrior Queen History Forgot]]></title>
    <link>https://example.com/queen-amina</link>
    <description><![CDATA[The incredible story of the 16th century Hausa warrior queen who never lost a battle.]]></description>
    <pubDate>Sat, 10 May 2026 07:00:00 GMT</pubDate>
    <category>History</category>
  </item>
</channel>
</rss>`;

function createMockFetch(xml = MOCK_RSS) {
  return async () => ({ ok: true, text: async () => xml });
}

describe("ContentResearchPipeline", () => {
  it("scans feed sources and extracts Nigeria-relevant leads", async () => {
    const pipeline = new ContentResearchPipeline({ fetchFn: createMockFetch() });
    const result = await pipeline.scanAllSources();

    assert.ok(result.leads.length > 0, "Should find Nigeria-relevant leads");
    assert.ok(result.rawItemCount > 0, "Should have raw items");

    const irrelevant = result.leads.find((l) => l.title === "New Restaurant Opens Downtown");
    assert.equal(irrelevant, undefined, "Should filter out non-Nigeria content");
  });

  it("ranks leads by combined score", async () => {
    const pipeline = new ContentResearchPipeline({ fetchFn: createMockFetch() });
    const result = await pipeline.scanAllSources();

    for (let i = 1; i < result.leads.length; i++) {
      assert.ok(
        result.leads[i - 1].scores.combinedScore >= result.leads[i].scores.combinedScore,
        "Leads should be sorted by descending score"
      );
    }
  });

  it("assigns suggested angles to leads", async () => {
    const pipeline = new ContentResearchPipeline({ fetchFn: createMockFetch() });
    const result = await pipeline.scanAllSources();

    for (const lead of result.leads) {
      assert.ok(Array.isArray(lead.suggestedAngles), "Each lead should have suggestedAngles");
      assert.ok(lead.suggestedAngles.length > 0, "Each lead should have at least one angle");
    }
  });

  it("handles fetch errors gracefully", async () => {
    const failFetch = async () => { throw new Error("Network error"); };
    const pipeline = new ContentResearchPipeline({ fetchFn: failFetch });
    const result = await pipeline.scanAllSources();

    assert.ok(result.errors.length > 0, "Should capture errors");
    assert.equal(result.leads.length, 0, "Should have no leads on total failure");
  });

  it("handles non-OK responses", async () => {
    const badFetch = async () => ({ ok: false, status: 500, text: async () => "" });
    const pipeline = new ContentResearchPipeline({ fetchFn: badFetch });
    const result = await pipeline.scanAllSources();

    assert.ok(result.errors.length > 0);
  });

  it("parses CDATA-wrapped content", async () => {
    const pipeline = new ContentResearchPipeline({ fetchFn: createMockFetch() });
    const result = await pipeline.scanAllSources();

    const aminaLead = result.leads.find((l) => l.title.includes("Queen Amina"));
    assert.ok(aminaLead, "Should parse CDATA-wrapped title");
  });

  it("generates a scan summary", async () => {
    const pipeline = new ContentResearchPipeline({ fetchFn: createMockFetch() });
    const result = await pipeline.scanAllSources();
    const summary = pipeline.getScanSummary(result);

    assert.ok(typeof summary.scannedSources === "number");
    assert.ok(typeof summary.rawItemsFound === "number");
    assert.ok(typeof summary.nigeriaRelevantLeads === "number");
    assert.ok(Array.isArray(summary.topLeads));
    assert.ok(summary.topLeads.length <= 10);
  });

  it("reports correct source count", () => {
    const pipeline = new ContentResearchPipeline();
    assert.ok(pipeline.getSourceCount() >= 25);
  });
});

describe("Keyword lists", () => {
  it("NIGERIA_KEYWORDS has sufficient coverage", () => {
    assert.ok(NIGERIA_KEYWORDS.length >= 20);
  });

  it("HISTORY_KEYWORDS has sufficient coverage", () => {
    assert.ok(HISTORY_KEYWORDS.length >= 15);
  });

  it("VIRAL_HOOKS has sufficient coverage", () => {
    assert.ok(VIRAL_HOOKS.length >= 10);
  });
});
