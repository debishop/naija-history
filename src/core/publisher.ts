import { getPool } from '../db/pool';
import { publishPost, FacebookPublishError } from '../services/facebook';
import type { DraftPost } from './contentGeneration';

export interface PostRecord {
  id: string;
  draftPostId: string;
  facebookPostId: string | null;
  publishedAt: Date;
  status: 'published' | 'failed' | 'retrying';
  errorMessage?: string;
}

interface DbDraftRow {
  id: number;
  story_candidate_id: number;
  body: string;
  hashtags: string[];
  source_url: string;
  source_name: string;
  status: string;
  created_at: Date;
}

interface DbPostRecordRow {
  id: number;
  draft_post_id: number;
  facebook_post_id: string | null;
  published_at: Date;
  status: string;
  error_message: string | null;
}

function rowToPostRecord(row: DbPostRecordRow): PostRecord {
  return {
    id: String(row.id),
    draftPostId: String(row.draft_post_id),
    facebookPostId: row.facebook_post_id,
    publishedAt: row.published_at,
    status: row.status as PostRecord['status'],
    errorMessage: row.error_message ?? undefined,
  };
}

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

function isTransientError(err: unknown): boolean {
  if (err instanceof FacebookPublishError) {
    // 5xx errors and rate limit (429) are transient
    return err.httpStatus >= 500 || err.httpStatus === 429 || err.graphError.code === 32 || err.graphError.code === 613;
  }
  return false;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function publishWithRetry(draft: DraftPost): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await publishPost(draft);
    } catch (err) {
      lastError = err;
      if (!isTransientError(err) || attempt === MAX_RETRIES) {
        break;
      }
      const delayMs = BASE_DELAY_MS * Math.pow(2, attempt);
      await sleep(delayMs);
    }
  }
  throw lastError;
}

async function loadDraftPost(id: string): Promise<DraftPost> {
  const pool = getPool();
  const result = await pool.query<DbDraftRow>(
    `SELECT id, story_candidate_id, body, hashtags, source_url, source_name, status, created_at
     FROM draft_posts WHERE id = $1`,
    [Number(id)]
  );
  if (result.rows.length === 0) {
    throw new Error(`DraftPost with id ${id} not found.`);
  }
  const row = result.rows[0];
  if (row.status !== 'approved') {
    throw new Error(
      `DraftPost ${id} has status "${row.status}" — only approved posts may be published.`
    );
  }
  return {
    id: String(row.id),
    storyCandidateId: String(row.story_candidate_id),
    body: row.body,
    hashtags: row.hashtags,
    sourceUrl: row.source_url,
    sourceName: row.source_name,
    generatedAt: row.created_at,
    status: row.status as DraftPost['status'],
  };
}

async function writePostRecord(
  draftPostId: string,
  facebookPostId: string | null,
  status: PostRecord['status'],
  errorMessage?: string
): Promise<PostRecord> {
  const pool = getPool();
  const result = await pool.query<DbPostRecordRow>(
    `INSERT INTO post_records (draft_post_id, facebook_post_id, status, error_message)
     VALUES ($1, $2, $3, $4)
     RETURNING id, draft_post_id, facebook_post_id, published_at, status, error_message`,
    [Number(draftPostId), facebookPostId, status, errorMessage ?? null]
  );
  return rowToPostRecord(result.rows[0]);
}

async function markDraftPublished(draftPostId: string): Promise<void> {
  const pool = getPool();
  await pool.query(
    `UPDATE draft_posts SET status = 'published', updated_at = NOW() WHERE id = $1`,
    [Number(draftPostId)]
  );
}

/**
 * Publishes an approved DraftPost to Facebook and persists the PostRecord.
 *
 * On success: writes PostRecord{status='published'} and updates DraftPost.status='published'.
 * On failure: writes PostRecord{status='failed', errorMessage} — never silently discards errors.
 * Retries transient errors (5xx, rate limit) with exponential backoff.
 */
export async function publishDraftPost(draftPostId: string): Promise<PostRecord> {
  const draft = await loadDraftPost(draftPostId);

  try {
    const facebookPostId = await publishWithRetry(draft);
    await markDraftPublished(draftPostId);
    return await writePostRecord(draftPostId, facebookPostId, 'published');
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const record = await writePostRecord(draftPostId, null, 'failed', errorMessage);
    // Re-throw so callers know the publish failed
    throw Object.assign(err instanceof Error ? err : new Error(errorMessage), { postRecord: record });
  }
}
