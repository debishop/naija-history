import { describe, it, mock, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { ImageGenerator, CANDIDATE_COUNT } from "./image-generator.js";

describe("ImageGenerator", () => {
  it("throws if apiKey is missing", () => {
    assert.throws(() => new ImageGenerator({}), /API key is required/);
  });

  it("fromEnv reads OPENAI_API_KEY", () => {
    process.env.OPENAI_API_KEY = "test-key";
    const gen = ImageGenerator.fromEnv();
    assert.ok(gen);
    delete process.env.OPENAI_API_KEY;
  });

  it("CANDIDATE_COUNT is 5", () => {
    assert.equal(CANDIDATE_COUNT, 5);
  });

  it("rejects empty prompt", async () => {
    const gen = new ImageGenerator({ apiKey: "key" });
    await assert.rejects(() => gen.generateCandidates(""), /non-empty string/);
    await assert.rejects(() => gen.generateCandidates(null), /non-empty string/);
  });

  it("rejects invalid count", async () => {
    const gen = new ImageGenerator({ apiKey: "key" });
    await assert.rejects(() => gen.generateCandidates("test", { count: 0 }), /between 1 and 10/);
    await assert.rejects(() => gen.generateCandidates("test", { count: 11 }), /between 1 and 10/);
  });

  describe("with mocked fetch", () => {
    let gen;
    let originalFetch;

    beforeEach(() => {
      gen = new ImageGenerator({ apiKey: "test-key", model: "dall-e-3" });
      originalFetch = globalThis.fetch;
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it("generates the requested number of candidates", async () => {
      let callCount = 0;
      globalThis.fetch = mock.fn(async () => {
        callCount++;
        return {
          json: async () => ({
            data: [{ url: `https://img.example.com/${callCount}.png`, revised_prompt: "revised" }],
          }),
        };
      });

      const images = await gen.generateCandidates("Nigerian history", { count: 3 });
      assert.equal(images.length, 3);
      assert.equal(images[0].index, 0);
      assert.equal(images[1].index, 1);
      assert.equal(images[2].index, 2);
      images.forEach((img) => {
        assert.ok(img.url.startsWith("https://"));
        assert.equal(img.revisedPrompt, "revised");
      });
    });

    it("defaults to CANDIDATE_COUNT (5) images", async () => {
      globalThis.fetch = mock.fn(async () => ({
        json: async () => ({
          data: [{ url: "https://img.example.com/test.png" }],
        }),
      }));

      const images = await gen.generateCandidates("Lagos skyline");
      assert.equal(images.length, 5);
    });

    it("throws on OpenAI API error", async () => {
      globalThis.fetch = mock.fn(async () => ({
        json: async () => ({ error: { message: "Rate limit exceeded" } }),
      }));

      await assert.rejects(
        () => gen.generateCandidates("test prompt", { count: 1 }),
        /OpenAI image generation failed: Rate limit exceeded/
      );
    });

    it("uses prompt as revisedPrompt when not returned", async () => {
      globalThis.fetch = mock.fn(async () => ({
        json: async () => ({
          data: [{ url: "https://img.example.com/test.png" }],
        }),
      }));

      const images = await gen.generateCandidates("original prompt", { count: 1 });
      assert.equal(images[0].revisedPrompt, "original prompt");
    });
  });
});
