import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AnalyticsDashboard } from "./analytics-dashboard.js";

function createMockFetch(responses = {}) {
  return async (url) => {
    const urlStr = typeof url === "string" ? url : url.toString();

    if (urlStr.includes("/insights")) {
      return { json: async () => responses.insights || { data: [] } };
    }
    if (urlStr.includes("/posts")) {
      return {
        json: async () => responses.posts || {
          data: [
            {
              id: "post_1",
              message: "The history of Lagos: from fishing village to Africa's largest city. This incredible journey spans centuries of trade, culture, and resilience.",
              created_time: new Date().toISOString(),
              type: "status",
              permalink_url: "https://fb.com/post_1",
              likes: { summary: { total_count: 150 } },
              comments: { summary: { total_count: 45 } },
              shares: { count: 30 },
            },
            {
              id: "post_2",
              message: "Queen Amina of Zazzau: the warrior queen who expanded the Hausa kingdom. #ad sponsored content for history book.",
              created_time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
              type: "photo",
              permalink_url: "https://fb.com/post_2",
              likes: { summary: { total_count: 80 } },
              comments: { summary: { total_count: 20 } },
              shares: { count: 15 },
            },
          ],
        },
      };
    }
    return {
      json: async () => responses.overview || {
        id: "page_123",
        name: "The Lens - Nigeria History",
        fan_count: 5000,
        followers_count: 4800,
        talking_about_count: 320,
      },
    };
  };
}

describe("AnalyticsDashboard", () => {
  it("requires pageId and accessToken", () => {
    assert.throws(() => new AnalyticsDashboard({}), /pageId is required/);
    assert.throws(() => new AnalyticsDashboard({ pageId: "123" }), /accessToken is required/);
  });

  it("gets page overview", async () => {
    const dashboard = new AnalyticsDashboard({
      pageId: "123",
      accessToken: "token",
      fetchFn: createMockFetch(),
    });
    const overview = await dashboard.getPageOverview();

    assert.equal(overview.name, "The Lens - Nigeria History");
    assert.equal(overview.followers_count, 4800);
  });

  it("gets recent posts with engagement metrics", async () => {
    const dashboard = new AnalyticsDashboard({
      pageId: "123",
      accessToken: "token",
      fetchFn: createMockFetch(),
    });
    const posts = await dashboard.getRecentPosts();

    assert.equal(posts.length, 2);
    assert.ok(posts[0].likes.summary.total_count > 0);
  });

  it("generates a weekly report", async () => {
    const dashboard = new AnalyticsDashboard({
      pageId: "123",
      accessToken: "token",
      fetchFn: createMockFetch(),
    });
    const report = await dashboard.generateWeeklyReport();

    assert.ok(report.generatedAt);
    assert.ok(report.reportPeriod.start);
    assert.ok(report.reportPeriod.end);
    assert.equal(report.pageOverview.name, "The Lens - Nigeria History");
    assert.equal(report.pageOverview.followers, 4800);
    assert.ok(report.weeklyActivity.postsPublished >= 0);
    assert.ok(typeof report.weeklyActivity.totalLikes === "number");
    assert.ok(typeof report.weeklyActivity.totalComments === "number");
    assert.ok(typeof report.weeklyActivity.totalShares === "number");
    assert.ok(typeof report.weeklyActivity.totalEngagement === "number");
    assert.ok(Array.isArray(report.topPerformingPosts));
    assert.ok(report.engagementBreakdown);
    assert.ok(report.contentROI);
  });

  it("calculates content ROI separating organic vs paid", async () => {
    const dashboard = new AnalyticsDashboard({
      pageId: "123",
      accessToken: "token",
      fetchFn: createMockFetch(),
    });
    const report = await dashboard.generateWeeklyReport();

    assert.ok(report.contentROI.organic);
    assert.ok(report.contentROI.paid);
    assert.ok(report.contentROI.organic.posts >= 0);
    assert.ok(report.contentROI.paid.posts >= 0);
  });

  it("formats report as markdown", async () => {
    const dashboard = new AnalyticsDashboard({
      pageId: "123",
      accessToken: "token",
      fetchFn: createMockFetch(),
    });
    const report = await dashboard.generateWeeklyReport();
    const markdown = dashboard.formatReportAsMarkdown(report);

    assert.ok(markdown.includes("# Weekly Analytics Report"));
    assert.ok(markdown.includes("## Page Overview"));
    assert.ok(markdown.includes("## Weekly Activity"));
    assert.ok(markdown.includes("## Top Performing Posts"));
    assert.ok(markdown.includes("## Content ROI"));
  });

  it("handles API errors in page overview", async () => {
    const errorFetch = async () => ({
      json: async () => ({ error: { message: "Token expired" } }),
    });
    const dashboard = new AnalyticsDashboard({
      pageId: "123",
      accessToken: "bad-token",
      fetchFn: errorFetch,
    });

    await assert.rejects(() => dashboard.getPageOverview(), /Token expired/);
  });

  it("gets individual post metrics", async () => {
    const mockFetch = async () => ({
      json: async () => ({
        id: "post_1",
        message: "Test post",
        created_time: new Date().toISOString(),
        type: "status",
        permalink_url: "https://fb.com/post_1",
        likes: { summary: { total_count: 100 } },
        comments: { summary: { total_count: 25 } },
        shares: { count: 10 },
      }),
    });
    const dashboard = new AnalyticsDashboard({
      pageId: "123",
      accessToken: "token",
      fetchFn: mockFetch,
    });
    const metrics = await dashboard.getPostMetrics("post_1");

    assert.equal(metrics.id, "post_1");
    assert.equal(metrics.metrics.likes, 100);
    assert.equal(metrics.metrics.comments, 25);
    assert.equal(metrics.metrics.shares, 10);
    assert.equal(metrics.metrics.totalEngagement, 135);
  });
});
