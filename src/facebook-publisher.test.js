import { describe, it, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { FacebookPublisher, FacebookPublishError, MIN_WORD_COUNT } from "./facebook-publisher.js";

describe("FacebookPublisher", () => {
  it("throws if pageId or accessToken missing", () => {
    assert.throws(() => new FacebookPublisher({ accessToken: "tok" }), /pageId is required/);
    assert.throws(() => new FacebookPublisher({ pageId: "123" }), /accessToken is required/);
  });

  it("fromEnv reads from environment", () => {
    process.env.FB_PAGE_ID = "test-page";
    process.env.FACEBOOK_SYSTEM_USER_TOKEN = "test-token";
    const pub = FacebookPublisher.fromEnv();
    assert.ok(pub);
    delete process.env.FB_PAGE_ID;
    delete process.env.FACEBOOK_SYSTEM_USER_TOKEN;
  });

  it("rejects empty message for text posts", async () => {
    const pub = new FacebookPublisher({ pageId: "123", accessToken: "tok" });
    await assert.rejects(() => pub.publishTextPost(""), /non-empty string/);
    await assert.rejects(() => pub.publishTextPost(null), /non-empty string/);
  });

  it("rejects text posts under 600 words", async () => {
    const pub = new FacebookPublisher({ pageId: "123", accessToken: "tok" });
    const shortMessage = Array(100).fill("word").join(" ");
    await assert.rejects(
      () => pub.publishTextPost(shortMessage),
      (err) => {
        assert.ok(err.message.includes(`at least ${MIN_WORD_COUNT} words`));
        assert.ok(err.message.includes("got 100"));
        return true;
      }
    );
  });

  it("accepts text posts with exactly 600 words", async () => {
    const pub = new FacebookPublisher({ pageId: "123", accessToken: "tok" });
    const exactMessage = Array(600).fill("word").join(" ");
    globalThis.fetch = mock.fn(async () => ({
      json: async () => ({ id: "12345_11111" }),
    }));
    const result = await pub.publishTextPost(exactMessage);
    assert.equal(result.id, "12345_11111");
    globalThis.fetch = undefined;
  });

  it("rejects photo without source", async () => {
    const pub = new FacebookPublisher({ pageId: "123", accessToken: "tok" });
    await assert.rejects(() => pub.publishPhoto({}), /imagePath or imageUrl is required/);
  });

  describe("with mocked fetch", () => {
    let pub;
    let originalFetch;
    const longMessage = Array(600).fill("Nigeria").join(" ");

    beforeEach(() => {
      pub = new FacebookPublisher({ pageId: "12345", accessToken: "test-token" });
      originalFetch = globalThis.fetch;
    });

    it("publishTextPost sends correct request and returns post id", async () => {
      globalThis.fetch = mock.fn(async (url, opts) => {
        assert.ok(url.includes("/12345/feed"));
        assert.equal(opts.method, "POST");
        return { json: async () => ({ id: "12345_67890" }) };
      });

      const result = await pub.publishTextPost(longMessage);
      assert.equal(result.id, "12345_67890");
      globalThis.fetch = originalFetch;
    });

    it("publishPhoto with URL sends correct request", async () => {
      globalThis.fetch = mock.fn(async (url, opts) => {
        assert.ok(url.includes("/12345/photos"));
        assert.equal(opts.method, "POST");
        return { json: async () => ({ id: "12345_99999", post_id: "12345_88888" }) };
      });

      const result = await pub.publishPhoto({
        imageUrl: "https://example.com/image.jpg",
        caption: "Historic Lagos",
      });
      assert.equal(result.id, "12345_99999");
      globalThis.fetch = originalFetch;
    });

    it("handles expired token error", async () => {
      globalThis.fetch = mock.fn(async () => ({
        status: 400,
        json: async () => ({
          error: { message: "Token expired", type: "OAuthException", code: 190, fbtrace_id: "abc" },
        }),
      }));

      await assert.rejects(
        () => pub.publishTextPost(longMessage),
        (err) => {
          assert.ok(err instanceof FacebookPublishError);
          assert.equal(err.code, 190);
          assert.ok(err.message.includes("System User token"));
          return true;
        }
      );
      globalThis.fetch = originalFetch;
    });

    it("handles rate limit error", async () => {
      globalThis.fetch = mock.fn(async () => ({
        status: 429,
        json: async () => ({
          error: { message: "Too many calls", type: "OAuthException", code: 4, fbtrace_id: "xyz" },
        }),
      }));

      await assert.rejects(
        () => pub.publishTextPost(longMessage),
        (err) => {
          assert.ok(err instanceof FacebookPublishError);
          assert.ok(err.message.includes("Rate limit"));
          return true;
        }
      );
      globalThis.fetch = originalFetch;
    });

    it("handles permission error", async () => {
      globalThis.fetch = mock.fn(async () => ({
        status: 403,
        json: async () => ({
          error: { message: "Insufficient permission", type: "OAuthException", code: 200, fbtrace_id: "perm" },
        }),
      }));

      await assert.rejects(
        () => pub.publishTextPost(longMessage),
        (err) => {
          assert.ok(err instanceof FacebookPublishError);
          assert.ok(err.message.includes("Permission error"));
          return true;
        }
      );
      globalThis.fetch = originalFetch;
    });

    it("verifyToken returns page info on success", async () => {
      globalThis.fetch = mock.fn(async () => ({
        json: async () => ({ id: "12345", name: "The Lens" }),
      }));

      const result = await pub.verifyToken();
      assert.deepEqual(result, { valid: true, pageId: "12345", pageName: "The Lens" });
      globalThis.fetch = originalFetch;
    });
  });
});
