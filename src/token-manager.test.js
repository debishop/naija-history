import { describe, it, mock, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { FacebookTokenManager } from "./token-manager.js";

describe("FacebookTokenManager", () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    process.env.FACEBOOK_APP_ID = "test-app-id";
    process.env.FACEBOOK_APP_SECRET = "test-app-secret";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.FACEBOOK_APP_ID;
    delete process.env.FACEBOOK_APP_SECRET;
    delete process.env.FACEBOOK_SYSTEM_USER_TOKEN;
    delete process.env.FACEBOOK_SYSTEM_USER_TOKEN_CREATED_AT;
  });

  it("throws if accessToken missing", () => {
    assert.throws(() => new FacebookTokenManager({}), /accessToken is required/);
  });

  it("fromEnv reads from environment", () => {
    process.env.FACEBOOK_SYSTEM_USER_TOKEN = "test-token";
    process.env.FACEBOOK_SYSTEM_USER_TOKEN_CREATED_AT = "2026-04-29T00:00:00.000Z";
    const mgr = FacebookTokenManager.fromEnv();
    assert.ok(mgr);
  });

  describe("checkTokenHealth", () => {
    it("returns healthy for valid non-expiring token", async () => {
      globalThis.fetch = mock.fn(async () => ({
        json: async () => ({
          data: {
            is_valid: true,
            app_id: "test-app-id",
            type: "PAGE",
            scopes: ["pages_manage_posts", "pages_read_engagement"],
            expires_at: 0,
          },
        }),
      }));

      const mgr = new FacebookTokenManager({ accessToken: "tok" });
      const result = await mgr.checkTokenHealth();
      assert.equal(result.status, "healthy");
      assert.equal(result.neverExpires, true);
      assert.ok(result.message.includes("never expires"));
      assert.equal(result.tokenCreatedAt, null);
      assert.equal(result.tokenAgeDays, null);
    });

    it("includes token age when tokenCreatedAt is provided", async () => {
      globalThis.fetch = mock.fn(async () => ({
        json: async () => ({
          data: {
            is_valid: true,
            app_id: "test-app-id",
            type: "PAGE",
            scopes: ["pages_manage_posts", "pages_read_engagement"],
            expires_at: 0,
          },
        }),
      }));

      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
      const mgr = new FacebookTokenManager({ accessToken: "tok", tokenCreatedAt: tenDaysAgo });
      const result = await mgr.checkTokenHealth();
      assert.equal(result.status, "healthy");
      assert.equal(result.tokenAgeDays, 10);
      assert.ok(result.tokenCreatedAt instanceof Date);
      assert.ok(result.message.includes("10 day(s)"));
    });

    it("returns invalid for expired token", async () => {
      globalThis.fetch = mock.fn(async () => ({
        json: async () => ({
          data: {
            is_valid: false,
            app_id: "test-app-id",
            type: "PAGE",
            scopes: [],
            expires_at: 0,
          },
        }),
      }));

      const mgr = new FacebookTokenManager({ accessToken: "tok" });
      const result = await mgr.checkTokenHealth();
      assert.equal(result.status, "invalid");
    });

    it("returns missing_scopes when required scopes absent", async () => {
      globalThis.fetch = mock.fn(async () => ({
        json: async () => ({
          data: {
            is_valid: true,
            app_id: "test-app-id",
            type: "PAGE",
            scopes: ["pages_read_engagement"],
            expires_at: 0,
          },
        }),
      }));

      const mgr = new FacebookTokenManager({ accessToken: "tok" });
      const result = await mgr.checkTokenHealth();
      assert.equal(result.status, "missing_scopes");
      assert.ok(result.message.includes("pages_manage_posts"));
    });

    it("returns expiring_soon when token expires within 7 days", async () => {
      const fiveDaysFromNow = Math.floor(Date.now() / 1000) + 5 * 24 * 60 * 60;
      globalThis.fetch = mock.fn(async () => ({
        json: async () => ({
          data: {
            is_valid: true,
            app_id: "test-app-id",
            type: "PAGE",
            scopes: ["pages_manage_posts", "pages_read_engagement"],
            expires_at: fiveDaysFromNow,
          },
        }),
      }));

      const mgr = new FacebookTokenManager({ accessToken: "tok" });
      const result = await mgr.checkTokenHealth();
      assert.equal(result.status, "expiring_soon");
      assert.ok(result.daysUntilExpiry <= 6);
    });

    it("returns healthy for token with far-off expiry", async () => {
      const sixtyDaysFromNow = Math.floor(Date.now() / 1000) + 60 * 24 * 60 * 60;
      globalThis.fetch = mock.fn(async () => ({
        json: async () => ({
          data: {
            is_valid: true,
            app_id: "test-app-id",
            type: "PAGE",
            scopes: ["pages_manage_posts", "pages_read_engagement"],
            expires_at: sixtyDaysFromNow,
          },
        }),
      }));

      const mgr = new FacebookTokenManager({ accessToken: "tok" });
      const result = await mgr.checkTokenHealth();
      assert.equal(result.status, "healthy");
    });
  });

  describe("getTokenDebugInfo", () => {
    it("throws if app credentials missing", async () => {
      delete process.env.FACEBOOK_APP_ID;
      delete process.env.FACEBOOK_APP_SECRET;
      const mgr = new FacebookTokenManager({ accessToken: "tok", appId: null, appSecret: null });
      await assert.rejects(() => mgr.getTokenDebugInfo(), /FACEBOOK_APP_ID and FACEBOOK_APP_SECRET are required/);
    });

    it("throws FacebookPublishError on API error", async () => {
      globalThis.fetch = mock.fn(async () => ({
        status: 400,
        json: async () => ({
          error: { message: "Invalid app", type: "OAuthException", code: 190, fbtrace_id: "abc" },
        }),
      }));

      const mgr = new FacebookTokenManager({ accessToken: "tok" });
      await assert.rejects(() => mgr.getTokenDebugInfo(), /Token debug failed/);
    });
  });

});
