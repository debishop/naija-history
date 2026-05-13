const EMOTION_LEXICON = {
  pride: ["proud", "pride", "glory", "triumph", "achievement", "greatness", "legacy", "heroic"],
  anger: ["injustice", "oppression", "exploitation", "betrayal", "stolen", "looted", "destroyed", "massacre"],
  curiosity: ["mystery", "secret", "unknown", "hidden", "discover", "reveal", "untold", "forgotten"],
  nostalgia: ["remember", "once", "used to", "those days", "golden age", "old", "ancient", "tradition"],
  surprise: ["shocking", "unbelievable", "incredible", "never knew", "didn't know", "first time", "actually"],
  sadness: ["tragic", "loss", "mourning", "fallen", "sacrifice", "death", "suffer", "famine"],
  hope: ["future", "progress", "renaissance", "rebuild", "new era", "breakthrough", "rising", "emerging"],
};

const HOOK_PATTERNS = [
  { pattern: /^(the|a) .+ (you|they|we) (never|didn't|don't) (knew|know)/i, strength: 9, type: "knowledge-gap" },
  { pattern: /^(what|why|how|who) .+ (really|actually) /i, strength: 8, type: "truth-reveal" },
  { pattern: /^the (untold|forgotten|hidden|secret|real) (story|history|truth)/i, strength: 9, type: "hidden-narrative" },
  { pattern: /^\d+ .+ (that|which) (changed|shaped|defined|transformed)/i, strength: 7, type: "listicle-impact" },
  { pattern: /^(before|after) .+ (everything changed|nothing was the same)/i, strength: 8, type: "turning-point" },
  { pattern: /^(meet|introducing) the .+ (who|that)/i, strength: 6, type: "character-intro" },
  { pattern: /^(on this day|today in|years ago)/i, strength: 7, type: "on-this-day" },
  { pattern: /^(myth|fact) vs (fact|myth|fiction)/i, strength: 8, type: "myth-busting" },
  { pattern: /\?$/, strength: 5, type: "question-hook" },
];

const AUDIENCE_SEGMENTS = {
  diaspora: {
    keywords: ["abroad", "diaspora", "overseas", "emigrate", "homeland", "return", "identity", "roots"],
    weight: 1.2,
  },
  youth: {
    keywords: ["youth", "young", "generation", "millennial", "gen-z", "student", "university", "future"],
    weight: 1.3,
  },
  culturalEnthusiasts: {
    keywords: ["culture", "art", "music", "dance", "festival", "tradition", "heritage", "craft"],
    weight: 1.1,
  },
  historyBuffs: {
    keywords: ["war", "battle", "kingdom", "empire", "colonial", "pre-colonial", "dynasty", "archaeological"],
    weight: 1.0,
  },
  politicallyEngaged: {
    keywords: ["politics", "democracy", "governance", "corruption", "reform", "election", "protest", "activism"],
    weight: 1.1,
  },
};

export class IdeaValidator {
  #recentTitles;

  constructor({ recentTitles = [] } = {}) {
    this.#recentTitles = recentTitles.map((t) => t.toLowerCase());
  }

  validateIdea(lead) {
    const title = lead.title || "";
    const description = lead.description || "";
    const text = `${title} ${description}`.toLowerCase();

    const viralityScore = this.#scoreVirality(text, title);
    const emotionProfile = this.#analyzeEmotions(text);
    const hookAnalysis = this.#analyzeHook(title);
    const audienceMatch = this.#scoreAudienceMatch(text);
    const saturationScore = this.#scoreSaturation(title);
    const timingBonus = this.#scoreTimingRelevance(lead);

    const weights = { virality: 0.25, emotion: 0.2, hook: 0.25, audience: 0.15, saturation: 0.1, timing: 0.05 };

    const finalScore =
      viralityScore.score * weights.virality +
      emotionProfile.intensity * weights.emotion +
      hookAnalysis.score * weights.hook +
      audienceMatch.score * weights.audience +
      saturationScore.score * weights.saturation +
      timingBonus * weights.timing;

    const normalizedScore = Math.min(10, Math.max(0, finalScore));

    return {
      lead: { title, source: lead.sourceName, link: lead.link },
      finalScore: Math.round(normalizedScore * 100) / 100,
      grade: this.#gradeScore(normalizedScore),
      breakdown: {
        virality: viralityScore,
        emotion: emotionProfile,
        hook: hookAnalysis,
        audience: audienceMatch,
        saturation: saturationScore,
        timingBonus,
      },
      recommendation: this.#generateRecommendation(normalizedScore, hookAnalysis, emotionProfile),
      suggestedHeadline: hookAnalysis.bestHookType ? this.#suggestHeadlineFormat(hookAnalysis.bestHookType, title) : null,
    };
  }

  validateBatch(leads) {
    return leads
      .map((lead) => this.validateIdea(lead))
      .sort((a, b) => b.finalScore - a.finalScore);
  }

  getTopIdeas(leads, count = 10) {
    const validated = this.validateBatch(leads);
    return validated.filter((v) => v.grade !== "skip").slice(0, count);
  }

  #scoreVirality(text, title) {
    let score = 0;
    const signals = [];

    if (title.length >= 40 && title.length <= 80) { score += 1; signals.push("optimal-title-length"); }
    if (/\d/.test(title)) { score += 0.5; signals.push("contains-number"); }
    if (title.includes("?")) { score += 0.5; signals.push("question-format"); }

    const shareableWords = ["share", "tell", "pass", "spread", "everyone", "must see", "must read", "must know"];
    for (const w of shareableWords) {
      if (text.includes(w)) { score += 0.5; signals.push(`shareable:${w}`); }
    }

    const controversyWords = ["debate", "controversy", "disagree", "unpopular", "opinion", "versus", "vs"];
    for (const w of controversyWords) {
      if (text.includes(w)) { score += 0.7; signals.push(`controversy:${w}`); }
    }

    const identityWords = ["nigerian", "naija", "our", "we", "us", "people", "nation"];
    for (const w of identityWords) {
      if (text.includes(w)) { score += 0.3; signals.push(`identity:${w}`); }
    }

    return { score: Math.min(10, score), signals };
  }

  #analyzeEmotions(text) {
    const detected = {};
    let totalHits = 0;
    let dominantEmotion = null;
    let maxHits = 0;

    for (const [emotion, words] of Object.entries(EMOTION_LEXICON)) {
      let hits = 0;
      for (const w of words) {
        if (text.includes(w)) hits++;
      }
      if (hits > 0) {
        detected[emotion] = hits;
        totalHits += hits;
        if (hits > maxHits) { maxHits = hits; dominantEmotion = emotion; }
      }
    }

    const intensity = Math.min(10, totalHits * 1.5);
    const emotionCount = Object.keys(detected).length;
    const diversity = emotionCount >= 3 ? "rich" : emotionCount >= 2 ? "moderate" : emotionCount === 1 ? "single" : "flat";

    return { detected, dominantEmotion, intensity, diversity };
  }

  #analyzeHook(title) {
    let bestScore = 0;
    let bestHookType = null;
    const matchedPatterns = [];

    for (const hp of HOOK_PATTERNS) {
      if (hp.pattern.test(title)) {
        matchedPatterns.push(hp.type);
        if (hp.strength > bestScore) {
          bestScore = hp.strength;
          bestHookType = hp.type;
        }
      }
    }

    if (matchedPatterns.length === 0) {
      bestScore = title.length > 20 ? 3 : 1;
    }

    return { score: bestScore, bestHookType, matchedPatterns, hasStrongHook: bestScore >= 7 };
  }

  #scoreAudienceMatch(text) {
    const segmentScores = {};
    let totalWeightedScore = 0;
    let segmentCount = 0;

    for (const [seg, config] of Object.entries(AUDIENCE_SEGMENTS)) {
      let hits = 0;
      for (const kw of config.keywords) {
        if (text.includes(kw)) hits++;
      }
      if (hits > 0) {
        segmentScores[seg] = hits * config.weight;
        totalWeightedScore += segmentScores[seg];
        segmentCount++;
      }
    }

    const reach = segmentCount >= 3 ? "broad" : segmentCount >= 2 ? "moderate" : segmentCount === 1 ? "niche" : "unclear";

    return { score: Math.min(10, totalWeightedScore * 1.5), segmentScores, reach, segmentsReached: segmentCount };
  }

  #scoreSaturation(title) {
    const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9\s]/g, "");
    const titleWords = new Set(normalizedTitle.split(/\s+/).filter((w) => w.length > 3));

    let maxOverlap = 0;
    for (const recent of this.#recentTitles) {
      const recentWords = new Set(recent.replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((w) => w.length > 3));
      let overlap = 0;
      for (const w of titleWords) {
        if (recentWords.has(w)) overlap++;
      }
      const overlapRatio = titleWords.size > 0 ? overlap / titleWords.size : 0;
      maxOverlap = Math.max(maxOverlap, overlapRatio);
    }

    const freshness = 10 * (1 - maxOverlap);
    return { score: freshness, overlapRatio: maxOverlap, isSaturated: maxOverlap > 0.5 };
  }

  #scoreTimingRelevance(lead) {
    if (!lead.pubDate) return 5;
    const ageMs = Date.now() - new Date(lead.pubDate).getTime();
    const ageHours = ageMs / (1000 * 60 * 60);
    if (ageHours < 24) return 10;
    if (ageHours < 72) return 8;
    if (ageHours < 168) return 6;
    if (ageHours < 720) return 4;
    return 2;
  }

  #gradeScore(score) {
    if (score >= 8) return "publish-now";
    if (score >= 6) return "strong-candidate";
    if (score >= 4) return "needs-work";
    if (score >= 2) return "low-priority";
    return "skip";
  }

  #generateRecommendation(score, hookAnalysis, emotionProfile) {
    const parts = [];

    if (score >= 8) {
      parts.push("High-priority story lead — move to production immediately.");
    } else if (score >= 6) {
      parts.push("Strong potential — refine the angle before publishing.");
    } else if (score >= 4) {
      parts.push("Moderate potential — needs a stronger hook or emotional angle.");
    } else {
      parts.push("Low potential in current form — consider shelving or major rework.");
    }

    if (!hookAnalysis.hasStrongHook) {
      parts.push("Rewrite headline with a stronger hook (knowledge-gap or hidden-narrative works best for this audience).");
    }
    if (emotionProfile.diversity === "flat") {
      parts.push("Add emotional resonance — pride, curiosity, or nostalgia perform well.");
    }

    return parts.join(" ");
  }

  #suggestHeadlineFormat(hookType, originalTitle) {
    const formats = {
      "knowledge-gap": `The ${originalTitle} Story You Were Never Told`,
      "truth-reveal": `What Really Happened: ${originalTitle}`,
      "hidden-narrative": `The Untold Story of ${originalTitle}`,
      "listicle-impact": originalTitle,
      "turning-point": `Before and After: How ${originalTitle} Changed Everything`,
      "character-intro": originalTitle,
      "on-this-day": `On This Day: ${originalTitle}`,
      "myth-busting": `Myth vs Reality: ${originalTitle}`,
      "question-hook": originalTitle,
    };
    return formats[hookType] || originalTitle;
  }
}

export { EMOTION_LEXICON, HOOK_PATTERNS, AUDIENCE_SEGMENTS };
