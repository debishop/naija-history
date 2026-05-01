import { getSecrets, SECRET_KEYS } from './secrets';
import type { DraftPost } from '../core/contentGeneration';

const GRAPH_API_VERSION = 'v19.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export interface TokenHealthResult {
  valid: boolean;
  tokenType: string | null;
  expiresAt: Date | null;
  scopes: string[];
  missingScopes: string[];
  error: string | null;
}

const REQUIRED_SCOPES = [
  'pages_manage_posts',
  'pages_read_engagement',
  'pages_show_list',
];

interface DebugTokenData {
  app_id?: string;
  type?: string;
  is_valid?: boolean;
  expires_at?: number;
  scopes?: string[];
  error?: { message: string; code: number };
}

export async function checkTokenHealth(): Promise<TokenHealthResult> {
  const secrets = getSecrets();
  const token = secrets.get(SECRET_KEYS.FACEBOOK_PAGE_ACCESS_TOKEN);
  const appSecret = process.env['FACEBOOK_APP_SECRET'] ?? '';

  const appId = process.env['FACEBOOK_APP_ID'] ?? '';
  const inputTokenParam = encodeURIComponent(token);

  let debugData: DebugTokenData | null = null;

  if (appId && appSecret) {
    const accessToken = `${appId}|${appSecret}`;
    const url = `${GRAPH_API_BASE}/debug_token?input_token=${inputTokenParam}&access_token=${encodeURIComponent(accessToken)}`;
    const response = await fetch(url);
    const json = (await response.json()) as { data?: DebugTokenData; error?: GraphApiError };

    if (json.data) {
      debugData = json.data;
    }
  }

  if (!debugData) {
    const url = `${GRAPH_API_BASE}/me?access_token=${inputTokenParam}`;
    const response = await fetch(url);
    const json = (await response.json()) as { id?: string; name?: string; error?: GraphApiError };

    if (!response.ok || json.error) {
      return {
        valid: false,
        tokenType: null,
        expiresAt: null,
        scopes: [],
        missingScopes: REQUIRED_SCOPES,
        error: json.error?.message ?? `HTTP ${response.status}`,
      };
    }

    return {
      valid: true,
      tokenType: 'unknown',
      expiresAt: null,
      scopes: [],
      missingScopes: [],
      error: null,
    };
  }

  if (!debugData.is_valid) {
    return {
      valid: false,
      tokenType: debugData.type ?? null,
      expiresAt: null,
      scopes: debugData.scopes ?? [],
      missingScopes: REQUIRED_SCOPES,
      error: debugData.error?.message ?? 'Token is invalid',
    };
  }

  const scopes = debugData.scopes ?? [];
  const missingScopes = REQUIRED_SCOPES.filter((s) => !scopes.includes(s));
  const expiresAt = debugData.expires_at && debugData.expires_at > 0
    ? new Date(debugData.expires_at * 1000)
    : null;

  return {
    valid: true,
    tokenType: debugData.type ?? null,
    expiresAt,
    scopes,
    missingScopes,
    error: missingScopes.length > 0 ? `Missing required scopes: ${missingScopes.join(', ')}` : null,
  };
}

export interface GraphApiError {
  message: string;
  type: string;
  code: number;
  fbtrace_id?: string;
}

export class FacebookPublishError extends Error {
  readonly graphError: GraphApiError;
  readonly httpStatus: number;

  constructor(graphError: GraphApiError, httpStatus: number) {
    super(`Facebook Graph API error (HTTP ${httpStatus}): ${graphError.message}`);
    this.name = 'FacebookPublishError';
    this.graphError = graphError;
    this.httpStatus = httpStatus;
  }
}

function buildPostMessage(draft: DraftPost): string {
  return draft.body;
}

/**
 * When a System User token is used, it must be exchanged for the page-specific
 * access token before posting. The /{page-id}/feed endpoint requires a Page
 * Access Token, not a User/System User token.
 */
async function resolvePageAccessToken(pageId: string, token: string): Promise<string> {
  const url = `${GRAPH_API_BASE}/${pageId}?fields=access_token&access_token=${encodeURIComponent(token)}`;
  const response = await fetch(url);
  const json = (await response.json()) as { access_token?: string; error?: GraphApiError };
  if (!response.ok || json.error) {
    // Token is already a Page Access Token — use it directly
    return token;
  }
  return json.access_token ?? token;
}

/**
 * Publishes a DraftPost to the configured Facebook Page.
 * Returns the Facebook post ID on success.
 * Throws FacebookPublishError on API failure.
 */
export async function publishPost(draft: DraftPost): Promise<string> {
  const secrets = getSecrets();
  const pageId = secrets.get(SECRET_KEYS.FACEBOOK_PAGE_ID);
  const userOrPageToken = secrets.get(SECRET_KEYS.FACEBOOK_PAGE_ACCESS_TOKEN);

  // Exchange for a Page Access Token if a System User token was provided
  const pageAccessToken = await resolvePageAccessToken(pageId, userOrPageToken);

  const message = buildPostMessage(draft);

  const url = `${GRAPH_API_BASE}/${pageId}/feed`;
  const body = new URLSearchParams({
    message,
    access_token: pageAccessToken,
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const json = (await response.json()) as { id?: string; error?: GraphApiError };

  if (!response.ok || json.error) {
    const graphError: GraphApiError = json.error ?? {
      message: `HTTP ${response.status} with no error body`,
      type: 'UnknownError',
      code: response.status,
    };
    throw new FacebookPublishError(graphError, response.status);
  }

  if (!json.id) {
    throw new FacebookPublishError(
      { message: 'No post ID returned from Graph API', type: 'UnexpectedResponse', code: 0 },
      response.status
    );
  }

  return json.id;
}

/**
 * Deletes a Facebook post. Uses the page access token derived from the configured System User token.
 */
export async function deletePost(facebookPostId: string): Promise<void> {
  const secrets = getSecrets();
  const pageId = secrets.get(SECRET_KEYS.FACEBOOK_PAGE_ID);
  const userOrPageToken = secrets.get(SECRET_KEYS.FACEBOOK_PAGE_ACCESS_TOKEN);
  const pageAccessToken = await resolvePageAccessToken(pageId, userOrPageToken);

  const url = `${GRAPH_API_BASE}/${facebookPostId}?access_token=${encodeURIComponent(pageAccessToken)}`;
  const response = await fetch(url, { method: 'DELETE' });
  const json = (await response.json()) as { success?: boolean; error?: GraphApiError };

  if (!response.ok || json.error) {
    const graphError: GraphApiError = json.error ?? {
      message: `HTTP ${response.status} with no error body`,
      type: 'UnknownError',
      code: response.status,
    };
    throw new FacebookPublishError(graphError, response.status);
  }
}

export interface RawEngagement {
  reactions: number;
  comments: number;
  shares: number;
  reach: number;
}

interface GraphApiEngagementResponse {
  id?: string;
  error?: GraphApiError;
  reactions?: { summary?: { total_count?: number } };
  comments?: { summary?: { total_count?: number } };
  shares?: { count?: number };
  insights?: {
    data?: Array<{
      name: string;
      values?: Array<{ value?: number }>;
    }>;
  };
}

/**
 * Fetches engagement metrics for a published Facebook post.
 * Returns reaction count, comment count, share count, and unique reach.
 */
export async function getPostEngagement(facebookPostId: string): Promise<RawEngagement> {
  const secrets = getSecrets();
  const pageAccessToken = secrets.get(SECRET_KEYS.FACEBOOK_PAGE_ACCESS_TOKEN);

  const fields = 'reactions.summary(true),comments.summary(true),shares,insights.metric(post_impressions_unique)';
  const url = `${GRAPH_API_BASE}/${facebookPostId}?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(pageAccessToken)}`;

  const response = await fetch(url);
  const json = (await response.json()) as GraphApiEngagementResponse;

  if (!response.ok || json.error) {
    const graphError: GraphApiError = json.error ?? {
      message: `HTTP ${response.status} with no error body`,
      type: 'UnknownError',
      code: response.status,
    };
    throw new FacebookPublishError(graphError, response.status);
  }

  const reachEntry = json.insights?.data?.find((d) => d.name === 'post_impressions_unique');
  const reach = reachEntry?.values?.[0]?.value ?? 0;

  return {
    reactions: json.reactions?.summary?.total_count ?? 0,
    comments: json.comments?.summary?.total_count ?? 0,
    shares: json.shares?.count ?? 0,
    reach,
  };
}
