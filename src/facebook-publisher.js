import { readFile } from "node:fs/promises";
import { basename } from "node:path";

const DEFAULT_API_VERSION = "v25.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${process.env.FACEBOOK_GRAPH_API_VERSION || DEFAULT_API_VERSION}`;
const MIN_WORD_COUNT = 600;

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function enforceMinWordCount(text, label = "Content") {
  const words = countWords(text);
  if (words < MIN_WORD_COUNT) {
    throw new Error(
      `${label} must be at least ${MIN_WORD_COUNT} words (got ${words}). Company policy requires a minimum of ${MIN_WORD_COUNT} words for all published content.`
    );
  }
}

export { MIN_WORD_COUNT };

export class FacebookPublishError extends Error {
  constructor(message, { statusCode, type, code, fbTraceId } = {}) {
    super(message);
    this.name = "FacebookPublishError";
    this.statusCode = statusCode;
    this.type = type;
    this.code = code;
    this.fbTraceId = fbTraceId;
  }
}

export class FacebookPublisher {
  #pageId;
  #accessToken;

  constructor({ pageId, accessToken }) {
    if (!pageId) throw new Error("pageId is required");
    if (!accessToken) throw new Error("accessToken is required");
    this.#pageId = pageId;
    this.#accessToken = accessToken;
  }

  static fromEnv() {
    return new FacebookPublisher({
      pageId: process.env.FACEBOOK_PAGE_ID,
      accessToken: process.env.FACEBOOK_SYSTEM_USER_TOKEN,
    });
  }

  async publishTextPost(message) {
    if (!message || typeof message !== "string") {
      throw new Error("message must be a non-empty string");
    }
    enforceMinWordCount(message, "Text post");

    const url = `${GRAPH_API_BASE}/${this.#pageId}/feed`;
    const body = new URLSearchParams({
      message,
      access_token: this.#accessToken,
    });

    const res = await fetch(url, { method: "POST", body });
    return this.#handleResponse(res);
  }

  async publishPhoto({ imagePath, imageUrl, caption }) {
    if (!imagePath && !imageUrl) {
      throw new Error("Either imagePath or imageUrl is required");
    }

    const url = `${GRAPH_API_BASE}/${this.#pageId}/photos`;

    let res;
    if (imageUrl) {
      const body = new URLSearchParams({
        url: imageUrl,
        access_token: this.#accessToken,
      });
      if (caption) body.set("message", caption);
      res = await fetch(url, { method: "POST", body });
    } else {
      const fileData = await readFile(imagePath);
      const form = new FormData();
      form.set("source", new Blob([fileData]), basename(imagePath));
      form.set("access_token", this.#accessToken);
      if (caption) form.set("message", caption);
      res = await fetch(url, { method: "POST", body: form });
    }

    return this.#handleResponse(res);
  }

  async verifyToken() {
    const url = `${GRAPH_API_BASE}/me?fields=id,name&access_token=${this.#accessToken}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.error) {
      throw new FacebookPublishError(
        `Token verification failed: ${data.error.message}`,
        {
          statusCode: res.status,
          type: data.error.type,
          code: data.error.code,
          fbTraceId: data.error.fbtrace_id,
        }
      );
    }

    return { valid: true, pageId: data.id, pageName: data.name };
  }

  async getPostInsights(postId) {
    const url = `${GRAPH_API_BASE}/${postId}?fields=id,message,created_time,shares,likes.summary(true),comments.summary(true)&access_token=${this.#accessToken}`;
    const res = await fetch(url);
    return this.#handleResponse(res);
  }

  async #handleResponse(res) {
    const data = await res.json();

    if (data.error) {
      const err = data.error;
      const msg = this.#classifyError(err, res.status);
      throw new FacebookPublishError(msg, {
        statusCode: res.status,
        type: err.type,
        code: err.code,
        fbTraceId: err.fbtrace_id,
      });
    }

    return data;
  }

  #classifyError(err, statusCode) {
    if (err.code === 190) {
      return `Token expired or invalid: ${err.message}. Check the System User token in Business Manager.`;
    }
    if (err.code === 200 || err.code === 10) {
      return `Permission error (code ${err.code}): ${err.message}. Ensure all required permissions are granted (ads_management, pages_manage_posts, etc). Run token-check for details.`;
    }
    if (statusCode === 429 || err.code === 32 || err.code === 4) {
      return `Rate limit hit (code ${err.code}): ${err.message}. Wait before retrying.`;
    }
    if (err.code === 506) {
      return `Duplicate post detected: ${err.message}. Facebook blocks identical content posted in quick succession.`;
    }
    return `Facebook API error (code ${err.code}): ${err.message}`;
  }
}
