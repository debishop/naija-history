import { getSecrets, SECRET_KEYS } from './secrets';
import type { DraftPost } from '../core/contentGeneration';

const GRAPH_API_VERSION = 'v19.0';
const PAGE_ID = '61577657207009';
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
 * Publishes a DraftPost to the configured Facebook Page.
 * Returns the Facebook post ID on success.
 * Throws FacebookPublishError on API failure.
 */
export async function publishPost(draft: DraftPost): Promise<string> {
  const secrets = getSecrets();
  const pageAccessToken = secrets.get(SECRET_KEYS.FACEBOOK_PAGE_ACCESS_TOKEN);

  const message = buildPostMessage(draft);

  const url = `${GRAPH_API_BASE}/${PAGE_ID}/feed`;
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
