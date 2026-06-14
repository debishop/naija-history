import { getSecrets, SECRET_KEYS } from '../services/secrets';
import { FacebookPublishError } from '../services/facebook';

export const MIN_WORD_COUNT = 50;

// Matches "CC BY-SA", "CC BY–SA", "CC BY SA", case-insensitive
const CREDIT_PATTERN = /CC\s+BY[-–\s]SA/i;
// Matches youtube.com or youtu.be video links
const VIDEO_LINK_PATTERN = /https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//;

const GRAPH_API_VERSION = 'v19.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export interface ApprovedPostInput {
  imageUrl: string;
  caption: string;
  approvedPostId: string; // idempotency key (Paperclip issue ID or pipeline run ID)
}

export interface PublishResult {
  postId: string;
  permalink: string;
}

interface GraphApiError {
  message: string;
  type: string;
  code: number;
}

export function validateApprovedPost(input: ApprovedPostInput): void {
  if (!input.imageUrl?.trim()) {
    throw new Error('imageUrl is required');
  }
  if (!input.caption?.trim()) {
    throw new Error('caption is required');
  }
  const wordCount = input.caption.split(/\s+/).filter(Boolean).length;
  if (wordCount < MIN_WORD_COUNT) {
    throw new Error(
      `caption must be at least ${MIN_WORD_COUNT} words (got ${wordCount})`
    );
  }
  if (!CREDIT_PATTERN.test(input.caption)) {
    throw new Error(
      'caption must contain a CC BY-SA credit line (e.g. "CC BY-SA 4.0")'
    );
  }
  if (!VIDEO_LINK_PATTERN.test(input.caption)) {
    throw new Error(
      'caption must contain a YouTube video link (https://youtube.com/... or https://youtu.be/...)'
    );
  }
}

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
 * Publishes an approved post (image + caption) to the configured Facebook Page.
 *
 * Validates the input before calling the Graph API. On FB error 506 (duplicate
 * content) the call is treated as a no-op and a descriptive error is thrown so
 * callers can detect and skip already-published posts.
 *
 * Returns the live post_id and permalink on success.
 */
export async function publishApprovedPost(input: ApprovedPostInput): Promise<PublishResult> {
  validateApprovedPost(input);

  const secrets = getSecrets();
  const pageId = secrets.get(SECRET_KEYS.FACEBOOK_PAGE_ID);
  const userToken = secrets.get(SECRET_KEYS.FACEBOOK_PAGE_ACCESS_TOKEN);
  const pageToken = await resolvePageAccessToken(pageId, userToken);

  const url = `${GRAPH_API_BASE}/${pageId}/photos`;
  const requestBody = new URLSearchParams({
    url: input.imageUrl,
    message: input.caption,
    published: 'true',
    access_token: pageToken,
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: requestBody.toString(),
  });

  const json = (await response.json()) as {
    id?: string;
    post_id?: string;
    error?: GraphApiError;
  };

  if (!response.ok || json.error) {
    const graphError: GraphApiError = json.error ?? {
      message: `HTTP ${response.status} with no error body`,
      type: 'UnknownError',
      code: response.status,
    };
    // FB error 506 = duplicate content (already published)
    if (graphError.code === 506) {
      throw new Error(
        `Approved post "${input.approvedPostId}" was already published — Facebook returned error 506 (duplicate content). Skipping.`
      );
    }
    throw new FacebookPublishError(graphError, response.status);
  }

  const postId = json.post_id ?? json.id;
  if (!postId) {
    throw new FacebookPublishError(
      { message: 'No post ID returned from Graph API', type: 'UnexpectedResponse', code: 0 },
      response.status
    );
  }

  return {
    postId,
    permalink: `https://www.facebook.com/${postId}`,
  };
}
