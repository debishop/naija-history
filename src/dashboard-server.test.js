import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createDashboardServer } from "./dashboard-server.js";
import { AnalyticsDashboard } from "./analytics-dashboard.js";

function createMockFetch(responses = {}) {
  return async (url) => {
    const urlStr = typeof url === "string" ? url : url.toString();

    if (urlStr.includes("/insights") && urlStr.includes("page_fans_")) {
      return {
        json: async () => responses.demographics || {
          data: [
            { name: "page_fans_gender_age", values: [{ value: { "M.25-34": 500, "F.25-34": 400, "M.35-44": 300 } }] },
            { name: "page_fans_city", values: [{ value: { Lagos: 800, Abuja: 400, "Port Harcourt": 200 } }] },
            { name: "page_fans_country", values: [{ value: { NG: 1200, US: 150, GB: 80 } }] },
          ],
        },
      };
    }
    if (urlStr.includes("/insights")) {
      return {
        json: async () => responses.insights || {
          data: [
            { name: "page_impressions", title: "Impressions", period: "day", values: [{ end_time: "2026-05-10T00:00:00Z", value: 1500 }, { end_time: "2026-05-11T00:00:00Z", value: 1800 }] },
            { name: "page_engaged_users", title: "Engaged Users", period: "day", values: [{ end_time: "2026-05-10T00:00:00Z", value: 200 }, { end_time: "2026-05-11T00:00:00Z", value: 250 }] },
          ],
        },
      };
    }
    if (urlStr.includes("/posts")) {
      return {
        json: async () => responses.posts || {
          data: [
            {
              id: "post_1", message: "History of Lagos", created_time: new Date().toISOString(),
              permalink_url: "https://fb.com/post_1",
              reactions: { summary: { total_count: 150 } }, comments: { summary: { total_count: 45 } },
            },
          ],
        },
      };
    }
    return {
      json: async () => responses.overview || {
        id: "page_123", name: "The Lens - Nigeria History",
        fan_count: 5000, followers_count: 4800, talking_about_count: 320,
      },
    };
  };
}

function createTestServer() {
  const dashboard = new AnalyticsDashboard({
    pageId: "123",
    accessToken: "test-token",
    fetchFn: createMockFetch(),
  });
  return createDashboardServer({ port: 0, dashboard });
}

let activeServer = null;

afterEach(async () => {
  if (activeServer) {
    await activeServer.stop();
    activeServer = null;
  }
});

describe("Dashboard Server", () => {
  it("serves HTML at /", async () => {
    activeServer = createTestServer();
    const server = await activeServer.start();
    const port = server.address().port;
    const res = await fetch(`http://localhost:${port}/`);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes("Page Monitoring Dashboard"));
    assert.ok(html.includes("chart.js"));
  });

  it("returns page overview from /api/overview", async () => {
    activeServer = createTestServer();
    const server = await activeServer.start();
    const port = server.address().port;
    const res = await fetch(`http://localhost:${port}/api/overview`);
    const data = await res.json();
    assert.equal(data.name, "The Lens - Nigeria History");
    assert.equal(data.followers_count, 4800);
  });

  it("returns posts from /api/posts", async () => {
    activeServer = createTestServer();
    const server = await activeServer.start();
    const port = server.address().port;
    const res = await fetch(`http://localhost:${port}/api/posts`);
    const data = await res.json();
    assert.ok(Array.isArray(data));
    assert.equal(data[0].id, "post_1");
  });

  it("returns time series from /api/timeseries", async () => {
    activeServer = createTestServer();
    const server = await activeServer.start();
    const port = server.address().port;
    const res = await fetch(`http://localhost:${port}/api/timeseries?period=day`);
    const data = await res.json();
    assert.ok(data.page_impressions);
    assert.ok(Array.isArray(data.page_impressions.values));
  });

  it("returns demographics from /api/demographics", async () => {
    activeServer = createTestServer();
    const server = await activeServer.start();
    const port = server.address().port;
    const res = await fetch(`http://localhost:${port}/api/demographics`);
    const data = await res.json();
    assert.ok(data.genderAge);
    assert.ok(data.cities);
    assert.ok(data.countries);
    assert.equal(data.genderAge["M.25-34"], 500);
    assert.equal(data.cities.Lagos, 800);
  });

  it("returns 404 for unknown routes", async () => {
    activeServer = createTestServer();
    const server = await activeServer.start();
    const port = server.address().port;
    const res = await fetch(`http://localhost:${port}/api/unknown`);
    assert.equal(res.status, 404);
  });

  it("returns weekly report from /api/report", async () => {
    activeServer = createTestServer();
    const server = await activeServer.start();
    const port = server.address().port;
    const res = await fetch(`http://localhost:${port}/api/report`);
    const data = await res.json();
    assert.ok(data.generatedAt);
    assert.ok(data.pageOverview);
    assert.ok(data.weeklyActivity);
  });
});

describe("AnalyticsDashboard - Demographics", () => {
  it("fetches audience demographics", async () => {
    const dashboard = new AnalyticsDashboard({
      pageId: "123",
      accessToken: "token",
      fetchFn: createMockFetch(),
    });
    const demo = await dashboard.getAudienceDemographics();
    assert.ok(demo.genderAge);
    assert.ok(demo.cities);
    assert.ok(demo.countries);
  });

  it("fetches insights time series", async () => {
    const dashboard = new AnalyticsDashboard({
      pageId: "123",
      accessToken: "token",
      fetchFn: createMockFetch(),
    });
    const series = await dashboard.getInsightsTimeSeries({ period: "day" });
    assert.ok(series.page_impressions);
    assert.equal(series.page_impressions.values.length, 2);
    assert.equal(series.page_impressions.values[0].value, 1500);
  });
});
