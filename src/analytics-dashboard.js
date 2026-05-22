import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const DEFAULT_API_VERSION = "v25.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${process.env.FACEBOOK_GRAPH_API_VERSION || DEFAULT_API_VERSION}`;

const DAY_ONLY_METRICS = new Set([
  "page_fan_adds",
  "page_fan_removes",
  "page_actions_post_reactions_total",
]);

export class AnalyticsDashboard {
  #pageId;
  #accessToken;
  #dataDir;
  #fetchFn;

  constructor({ pageId, accessToken, dataDir = "./data/analytics", fetchFn = fetch }) {
    if (!pageId) throw new Error("pageId is required");
    if (!accessToken) throw new Error("accessToken is required");
    this.#pageId = pageId;
    this.#accessToken = accessToken;
    this.#dataDir = dataDir;
    this.#fetchFn = fetchFn;
  }

  static fromEnv({ dataDir, fetchFn } = {}) {
    return new AnalyticsDashboard({
      pageId: process.env.FACEBOOK_PAGE_ID,
      accessToken: process.env.FACEBOOK_SYSTEM_USER_TOKEN,
      dataDir,
      fetchFn,
    });
  }

  async getPageOverview() {
    const fields = "id,name,fan_count,followers_count,talking_about_count,new_like_count,were_here_count";
    const url = `${GRAPH_API_BASE}/${this.#pageId}?fields=${fields}&access_token=${this.#accessToken}`;
    const res = await this.#fetchFn(url);
    const data = await res.json();
    if (data.error) throw new Error(`Facebook API error: ${data.error.message}`);
    return data;
  }

  async getPageInsights({ period = "week", metrics } = {}) {
    const defaultMetrics = [
      "page_impressions",
      "page_impressions_unique",
      "page_engaged_users",
      "page_post_engagements",
      "page_fan_adds",
      "page_fan_removes",
      "page_views_total",
      "page_actions_post_reactions_total",
    ];
    const allMetrics = metrics || defaultMetrics;
    const results = await this.#fetchMetricsByPeriod(allMetrics, period);
    return results;
  }

  async getRecentPosts({ limit = 25 } = {}) {
    const fields = "id,message,created_time,shares,likes.summary(true),comments.summary(true),type,permalink_url";
    const url = `${GRAPH_API_BASE}/${this.#pageId}/posts?fields=${fields}&limit=${limit}&access_token=${this.#accessToken}`;
    const res = await this.#fetchFn(url);
    const data = await res.json();
    if (data.error) throw new Error(`Facebook API error: ${data.error.message}`);
    return data.data || [];
  }

  async getPostMetrics(postId) {
    const fields = "id,message,created_time,shares,likes.summary(true),comments.summary(true),type,permalink_url";
    const url = `${GRAPH_API_BASE}/${postId}?fields=${fields}&access_token=${this.#accessToken}`;
    const res = await this.#fetchFn(url);
    const data = await res.json();
    if (data.error) throw new Error(`Facebook API error: ${data.error.message}`);
    return this.#normalizePostMetrics(data);
  }

  #normalizePostMetrics(post) {
    const likes = post.likes?.summary?.total_count || 0;
    const comments = post.comments?.summary?.total_count || 0;
    const shares = post.shares?.count || 0;
    const totalEngagement = likes + comments + shares;

    return {
      id: post.id,
      message: post.message || "",
      createdAt: post.created_time,
      type: post.type,
      permalink: post.permalink_url,
      metrics: { likes, comments, shares, totalEngagement },
    };
  }

  async generateWeeklyReport() {
    const [overview, posts, insights] = await Promise.all([
      this.getPageOverview(),
      this.getRecentPosts({ limit: 50 }),
      this.getPageInsights({ period: "week" }).catch(() => []),
    ]);

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisWeekPosts = posts.filter((p) => new Date(p.created_time) >= weekAgo);

    const normalizedPosts = thisWeekPosts.map((p) => this.#normalizePostMetrics(p));
    const topPosts = [...normalizedPosts].sort((a, b) => b.metrics.totalEngagement - a.metrics.totalEngagement).slice(0, 5);

    const totalLikes = normalizedPosts.reduce((sum, p) => sum + p.metrics.likes, 0);
    const totalComments = normalizedPosts.reduce((sum, p) => sum + p.metrics.comments, 0);
    const totalShares = normalizedPosts.reduce((sum, p) => sum + p.metrics.shares, 0);
    const totalEngagement = totalLikes + totalComments + totalShares;
    const avgEngagement = normalizedPosts.length > 0 ? totalEngagement / normalizedPosts.length : 0;

    const insightsSummary = {};
    for (const metric of insights) {
      const latestValue = metric.values?.[metric.values.length - 1];
      insightsSummary[metric.name] = {
        title: metric.title,
        value: latestValue?.value ?? null,
        period: metric.period,
      };
    }

    const report = {
      generatedAt: now.toISOString(),
      reportPeriod: { start: weekAgo.toISOString(), end: now.toISOString() },
      pageOverview: {
        name: overview.name,
        followers: overview.followers_count || overview.fan_count || 0,
        talkingAbout: overview.talking_about_count || 0,
      },
      weeklyActivity: {
        postsPublished: normalizedPosts.length,
        totalLikes,
        totalComments,
        totalShares,
        totalEngagement,
        avgEngagementPerPost: Math.round(avgEngagement * 100) / 100,
      },
      topPerformingPosts: topPosts,
      engagementBreakdown: {
        likesPercent: totalEngagement > 0 ? Math.round((totalLikes / totalEngagement) * 100) : 0,
        commentsPercent: totalEngagement > 0 ? Math.round((totalComments / totalEngagement) * 100) : 0,
        sharesPercent: totalEngagement > 0 ? Math.round((totalShares / totalEngagement) * 100) : 0,
      },
      pageInsights: insightsSummary,
      contentROI: this.#calculateContentROI(normalizedPosts),
    };

    return report;
  }

  #calculateContentROI(posts) {
    if (posts.length === 0) return { organic: { posts: 0, avgEngagement: 0 } };

    const organic = posts.filter((p) => !p.message?.includes("#ad") && !p.message?.includes("#sponsored"));
    const paid = posts.filter((p) => p.message?.includes("#ad") || p.message?.includes("#sponsored"));

    const organicEngagement = organic.reduce((s, p) => s + p.metrics.totalEngagement, 0);
    const paidEngagement = paid.reduce((s, p) => s + p.metrics.totalEngagement, 0);

    return {
      organic: {
        posts: organic.length,
        totalEngagement: organicEngagement,
        avgEngagement: organic.length > 0 ? Math.round(organicEngagement / organic.length) : 0,
      },
      paid: {
        posts: paid.length,
        totalEngagement: paidEngagement,
        avgEngagement: paid.length > 0 ? Math.round(paidEngagement / paid.length) : 0,
      },
    };
  }

  formatReportAsMarkdown(report) {
    const lines = [
      `# Weekly Analytics Report`,
      `**Period:** ${report.reportPeriod.start.slice(0, 10)} to ${report.reportPeriod.end.slice(0, 10)}`,
      `**Generated:** ${report.generatedAt.slice(0, 16).replace("T", " ")}`,
      ``,
      `## Page Overview`,
      `- **Page:** ${report.pageOverview.name}`,
      `- **Followers:** ${report.pageOverview.followers.toLocaleString()}`,
      `- **Talking About:** ${report.pageOverview.talkingAbout.toLocaleString()}`,
      ``,
      `## Weekly Activity`,
      `- **Posts Published:** ${report.weeklyActivity.postsPublished}`,
      `- **Total Engagement:** ${report.weeklyActivity.totalEngagement.toLocaleString()}`,
      `- **Avg Engagement/Post:** ${report.weeklyActivity.avgEngagementPerPost}`,
      `- **Likes:** ${report.weeklyActivity.totalLikes} (${report.engagementBreakdown.likesPercent}%)`,
      `- **Comments:** ${report.weeklyActivity.totalComments} (${report.engagementBreakdown.commentsPercent}%)`,
      `- **Shares:** ${report.weeklyActivity.totalShares} (${report.engagementBreakdown.sharesPercent}%)`,
      ``,
      `## Top Performing Posts`,
    ];

    for (const [i, post] of report.topPerformingPosts.entries()) {
      const preview = post.message.slice(0, 80).replace(/\n/g, " ");
      lines.push(`${i + 1}. **"${preview}..."**`);
      lines.push(`   Likes: ${post.metrics.likes} | Comments: ${post.metrics.comments} | Shares: ${post.metrics.shares}`);
    }

    lines.push("", "## Content ROI");
    lines.push(`- **Organic:** ${report.contentROI.organic.posts} posts, avg ${report.contentROI.organic.avgEngagement} engagement`);
    lines.push(`- **Paid:** ${report.contentROI.paid.posts} posts, avg ${report.contentROI.paid.avgEngagement} engagement`);

    if (Object.keys(report.pageInsights).length > 0) {
      lines.push("", "## Page Insights");
      for (const [key, val] of Object.entries(report.pageInsights)) {
        if (val.value !== null) {
          const displayVal = typeof val.value === "object" ? JSON.stringify(val.value) : val.value;
          lines.push(`- **${val.title}:** ${displayVal}`);
        }
      }
    }

    return lines.join("\n");
  }

  async getAudienceDemographics() {
    const metrics = ["page_fans_gender_age", "page_fans_city", "page_fans_country"];
    const metricList = metrics.join(",");
    const url = `${GRAPH_API_BASE}/${this.#pageId}/insights?metric=${metricList}&period=lifetime&access_token=${this.#accessToken}`;
    const res = await this.#fetchFn(url);
    const data = await res.json();
    if (data.error) throw new Error(`Facebook API error: ${data.error.message}`);

    const result = { genderAge: {}, cities: {}, countries: {} };
    for (const metric of data.data || []) {
      const latestValue = metric.values?.[metric.values.length - 1]?.value || {};
      if (metric.name === "page_fans_gender_age") result.genderAge = latestValue;
      else if (metric.name === "page_fans_city") result.cities = latestValue;
      else if (metric.name === "page_fans_country") result.countries = latestValue;
    }
    return result;
  }

  async getInsightsTimeSeries({ period = "day", since, until, metrics } = {}) {
    const defaultMetrics = [
      "page_impressions",
      "page_impressions_unique",
      "page_engaged_users",
      "page_post_engagements",
      "page_fan_adds",
      "page_views_total",
    ];
    const allMetrics = metrics || defaultMetrics;
    const results = await this.#fetchMetricsByPeriod(allMetrics, period, { since, until });

    const series = {};
    for (const metric of results) {
      series[metric.name] = {
        title: metric.title,
        description: metric.description,
        period: metric.period,
        values: (metric.values || []).map((v) => ({
          date: v.end_time,
          value: v.value,
        })),
      };
    }
    return series;
  }

  async #fetchMetricsByPeriod(metrics, period, { since, until } = {}) {
    const needsFallback = period !== "day";
    const primaryMetrics = needsFallback ? metrics.filter((m) => !DAY_ONLY_METRICS.has(m)) : metrics;
    const fallbackMetrics = needsFallback ? metrics.filter((m) => DAY_ONLY_METRICS.has(m)) : [];

    const fetches = [];
    if (primaryMetrics.length) fetches.push(this.#fetchInsights(primaryMetrics, period, { since, until }));
    if (fallbackMetrics.length) fetches.push(this.#fetchInsights(fallbackMetrics, "day", { since, until }));

    const batches = await Promise.all(fetches.map((p) => p.catch(() => [])));
    return batches.flat();
  }

  async #fetchInsights(metrics, period, { since, until } = {}) {
    const metricList = metrics.join(",");
    let url = `${GRAPH_API_BASE}/${this.#pageId}/insights?metric=${metricList}&period=${period}&access_token=${this.#accessToken}`;
    if (since) url += `&since=${Math.floor(new Date(since).getTime() / 1000)}`;
    if (until) url += `&until=${Math.floor(new Date(until).getTime() / 1000)}`;
    const res = await this.#fetchFn(url);
    const data = await res.json();
    if (data.error) throw new Error(`Facebook API error: ${data.error.message}`);
    return data.data || [];
  }

  async saveReport(report, filename) {
    await mkdir(this.#dataDir, { recursive: true });
    const path = join(this.#dataDir, filename || `report-${new Date().toISOString().slice(0, 10)}.json`);
    await writeFile(path, JSON.stringify(report, null, 2));
    return path;
  }
}
