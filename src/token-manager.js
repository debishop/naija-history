import { FacebookPublishError } from "./facebook-publisher.js";

const DEFAULT_API_VERSION = "v25.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${process.env.FACEBOOK_GRAPH_API_VERSION || DEFAULT_API_VERSION}`;

export class FacebookTokenManager {
  #accessToken;
  #appId;
  #appSecret;
  #tokenCreatedAt;

  constructor({ accessToken, appId, appSecret, tokenCreatedAt }) {
    if (!accessToken) throw new Error("accessToken is required");
    this.#accessToken = accessToken;
    this.#appId = appId || process.env.FACEBOOK_APP_ID;
    this.#appSecret = appSecret || process.env.FACEBOOK_APP_SECRET;
    this.#tokenCreatedAt = tokenCreatedAt ? new Date(tokenCreatedAt) : null;
  }

  static fromEnv() {
    return new FacebookTokenManager({
      accessToken: process.env.FACEBOOK_SYSTEM_USER_TOKEN,
      tokenCreatedAt: process.env.FACEBOOK_SYSTEM_USER_TOKEN_CREATED_AT,
    });
  }

  async checkTokenHealth() {
    const debug = await this.getTokenDebugInfo();

    const result = {
      valid: debug.is_valid,
      appId: debug.app_id,
      type: debug.type,
      scopes: debug.scopes || [],
      expiresAt: debug.expires_at === 0 ? null : new Date(debug.expires_at * 1000),
      neverExpires: debug.expires_at === 0,
    };

    if (!result.valid) {
      return { ...result, status: "invalid", message: "Token is no longer valid. Regenerate it." };
    }

    const requiredScopes = [
      "ads_management",
      "ads_read",
      "attribution_read",
      "business_management",
      "catalog_management",
      "leads_retrieval",
      "page_events",
      "pages_manage_ads",
      "pages_manage_cta",
      "pages_manage_engagement",
      "pages_manage_instant_articles",
      "pages_manage_metadata",
      "pages_manage_posts",
      "pages_messaging",
      "pages_read_engagement",
      "pages_read_user_content",
      "pages_show_list",
      "publish_video",
      "read_insights",
      "read_page_mailboxes",
    ];
    const missingScopes = requiredScopes.filter((s) => !result.scopes.includes(s));
    if (missingScopes.length > 0) {
      return { ...result, status: "missing_scopes", message: `Missing required scopes: ${missingScopes.join(", ")}` };
    }

    if (result.expiresAt) {
      const daysUntilExpiry = (result.expiresAt - Date.now()) / (1000 * 60 * 60 * 24);
      if (daysUntilExpiry <= 0) {
        return { ...result, status: "expired", message: "Token has expired." };
      }
      if (daysUntilExpiry <= 7) {
        return { ...result, status: "expiring_soon", daysUntilExpiry: Math.ceil(daysUntilExpiry), message: `Token expires in ${Math.ceil(daysUntilExpiry)} day(s).` };
      }
    }

    const tokenAge = this.#tokenCreatedAt
      ? Math.floor((Date.now() - this.#tokenCreatedAt.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const base = { ...result, tokenCreatedAt: this.#tokenCreatedAt, tokenAgeDays: tokenAge };

    if (result.neverExpires) {
      const ageNote = tokenAge !== null ? ` Token age: ${tokenAge} day(s).` : "";
      return { ...base, status: "healthy", message: `Token is valid and never expires.${ageNote}` };
    }
    return { ...base, status: "healthy", message: `Token is valid. Expires ${result.expiresAt.toISOString()}.` };
  }

  async getTokenDebugInfo() {
    if (!this.#appId || !this.#appSecret) {
      throw new Error("FACEBOOK_APP_ID and FACEBOOK_APP_SECRET are required for token debug. Set them in env vars or Doppler.");
    }

    const appToken = `${this.#appId}|${this.#appSecret}`;
    const url = `${GRAPH_API_BASE}/debug_token?input_token=${encodeURIComponent(this.#accessToken)}&access_token=${encodeURIComponent(appToken)}`;
    const res = await fetch(url);
    const json = await res.json();

    if (json.error) {
      throw new FacebookPublishError(`Token debug failed: ${json.error.message}`, {
        statusCode: res.status,
        type: json.error.type,
        code: json.error.code,
        fbTraceId: json.error.fbtrace_id,
      });
    }

    return json.data;
  }

}
