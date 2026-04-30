import { getSecrets, SECRET_KEYS } from './secrets';
import type { DraftPost } from '../core/contentGeneration';

const GRAPH_API_VERSION = 'v19.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

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
