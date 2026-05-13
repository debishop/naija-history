import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { APPROVED_SOURCES, getFeedSources } from "./source-whitelist.js";

const NIGERIA_KEYWORDS = [
  "nigeria", "nigerian", "naija", "lagos", "abuja", "igbo", "yoruba", "hausa",
  "fulani", "benin kingdom", "biafra", "civil war", "independence", "colonial",
  "british empire", "royal niger", "amalgamation", "abeokuta", "calabar", "kano",
  "sokoto", "oyo empire", "nok culture", "ile-ife", "oba", "emir", "sultan",
  "obafemi awolowo", "nnamdi azikiwe", "ahmadu bello", "tafawa balewa",
  "ken saro-wiwa", "wole soyinka", "chinua achebe", "fela kuti",
  "queen amina", "moremi", "efunroye tinubu", "funmilayo ransome-kuti",
  "oil boom", "ogoni", "niger delta", "boko haram", "endsars",
  "nollywood", "afrobeats", "jollof", "pidgin",
];

const HISTORY_KEYWORDS = [
  "history", "historical", "heritage", "legacy", "colonial", "pre-colonial",
  "independence", "founding", "origin", "ancient", "century", "era", "dynasty",
  "kingdom", "empire", "war", "revolution", "movement", "struggle", "liberation",
  "tradition", "cultural", "archaeological", "artifact", "monument",
  "anniversary", "commemoration", "forgotten", "untold", "little-known",
];

const VIRAL_HOOKS = [
  "never knew", "didn't know", "little-known", "untold", "forgotten",
  "hidden", "secret", "shocking", "incredible", "unbelievable",
  "changed everything", "first ever", "last time", "before and after",
  "the real story", "what really happened", "myth vs reality",
  "you won't believe", "most people don't know",
];

export class ContentResearchPipeline {
  #dataDir;
  #fetchFn;

  constructor({ dataDir = "./data/research", fetchFn = fetch } = {}) {
    this.#dataDir = dataDir;
    this.#fetchFn = fetchFn;
  }

  async scanAllSources({ maxPerSource = 20, timeoutMs = 10000 } = {}) {
    const sources = getFeedSources();
    const results = [];
    const errors = [];

    for (const source of sources) {
      try {
        const items = await this.#scanFeedSource(source, { maxPerSource, timeoutMs });
        results.push(...items);
      } catch (err) {
        errors.push({ sourceId: source.id, error: err.message });
      }
    }

    const leads = this.#extractStoryLeads(results);
    return { leads, scannedSources: sources.length, errors, rawItemCount: results.length };
  }

  async #scanFeedSource(source, { maxPerSource, timeoutMs }) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await this.#fetchFn(source.feedUrl, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const xml = await res.text();
      return this.#parseRssFeed(xml, source).slice(0, maxPerSource);
    } finally {
      clearTimeout(timeout);
    }
  }

  #parseRssFeed(xml, source) {
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
      const block = match[1];
      const title = this.#extractTag(block, "title");
      const link = this.#extractTag(block, "link");
      const description = this.#stripHtml(this.#extractTag(block, "description"));
      const pubDate = this.#extractTag(block, "pubDate");
      const category = this.#extractTag(block, "category");

      if (title) {
        items.push({
          sourceId: source.id,
          sourceName: source.name,
          sourceCategory: source.category,
          title,
          link,
          description,
          pubDate: pubDate ? new Date(pubDate).toISOString() : null,
          category,
          fetchedAt: new Date().toISOString(),
        });
      }
    }

    return items;
  }

  #extractTag(block, tag) {
    const cdataMatch = block.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, "i"));
    if (cdataMatch) return cdataMatch[1].trim();
    const simpleMatch = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
    return simpleMatch ? simpleMatch[1].trim() : "";
  }

  #stripHtml(html) {
    return html.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#039;/g, "'").trim();
  }

  #extractStoryLeads(rawItems) {
    return rawItems
      .map((item) => {
        const text = `${item.title} ${item.description}`.toLowerCase();
        const nigeriaRelevance = this.#scoreKeywordMatch(text, NIGERIA_KEYWORDS);
        const historyRelevance = this.#scoreKeywordMatch(text, HISTORY_KEYWORDS);
        const viralPotential = this.#scoreKeywordMatch(text, VIRAL_HOOKS);

        if (nigeriaRelevance === 0) return null;

        return {
          ...item,
          scores: {
            nigeriaRelevance,
            historyRelevance,
            viralPotential,
            combinedScore: nigeriaRelevance * 2 + historyRelevance * 1.5 + viralPotential * 3,
          },
          suggestedAngles: this.#suggestAngles(item, { nigeriaRelevance, historyRelevance, viralPotential }),
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.scores.combinedScore - a.scores.combinedScore);
  }

  #scoreKeywordMatch(text, keywords) {
    let score = 0;
    for (const kw of keywords) {
      if (text.includes(kw)) score++;
    }
    return score;
  }

  #suggestAngles(item, scores) {
    const angles = [];
    const text = `${item.title} ${item.description}`.toLowerCase();

    if (scores.historyRelevance >= 2) {
      angles.push("historical-deep-dive");
    }
    if (text.includes("anniversary") || text.includes("commemoration") || text.includes("years ago")) {
      angles.push("on-this-day");
    }
    if (scores.viralPotential >= 1) {
      angles.push("myth-busting");
    }
    if (text.includes("untold") || text.includes("forgotten") || text.includes("little-known")) {
      angles.push("hidden-history");
    }
    if (text.includes("war") || text.includes("conflict") || text.includes("struggle")) {
      angles.push("conflict-narrative");
    }
    if (text.includes("culture") || text.includes("tradition") || text.includes("heritage")) {
      angles.push("cultural-spotlight");
    }
    if (text.includes("economy") || text.includes("trade") || text.includes("oil") || text.includes("commerce")) {
      angles.push("economic-history");
    }
    if (angles.length === 0) {
      angles.push("news-tie-in");
    }

    return angles;
  }

  async saveLeads(leads, filename) {
    await mkdir(this.#dataDir, { recursive: true });
    const path = join(this.#dataDir, filename || `leads-${new Date().toISOString().slice(0, 10)}.json`);
    await writeFile(path, JSON.stringify({ generatedAt: new Date().toISOString(), count: leads.length, leads }, null, 2));
    return path;
  }

  async loadLeads(filename) {
    const path = join(this.#dataDir, filename);
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw);
  }

  getSourceCount() {
    return APPROVED_SOURCES.length;
  }

  getScanSummary(scanResult) {
    const { leads, scannedSources, errors, rawItemCount } = scanResult;
    const topLeads = leads.slice(0, 10);
    return {
      scannedSources,
      totalSourcesConfigured: APPROVED_SOURCES.length,
      rawItemsFound: rawItemCount,
      nigeriaRelevantLeads: leads.length,
      topLeads: topLeads.map((l) => ({
        title: l.title,
        source: l.sourceName,
        score: l.scores.combinedScore,
        angles: l.suggestedAngles,
      })),
      errorCount: errors.length,
      errors,
    };
  }
}

export { NIGERIA_KEYWORDS, HISTORY_KEYWORDS, VIRAL_HOOKS };
