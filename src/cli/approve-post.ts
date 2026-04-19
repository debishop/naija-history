import * as dotenv from 'dotenv';
dotenv.config();

import { publishDraftPost, scheduleEngagementSnapshot } from '../core/publisher';
import { notifySlack } from '../services/notifications';
import { getPool } from '../db/pool';

interface DraftRow {
  id: number;
  status: string;
  body: string;
}

async function getDraft(draftId: string): Promise<DraftRow> {
  const pool = getPool();
  const result = await pool.query<DraftRow>(
    `SELECT id, status, body FROM draft_posts WHERE id = $1`,
    [Number(draftId)]
  );
  if (result.rows.length === 0) {
    throw new Error(`Draft post ${draftId} not found.`);
  }
  return result.rows[0];
}

async function setDraftApproved(draftId: string): Promise<void> {
  const pool = getPool();
  await pool.query(
    `UPDATE draft_posts SET status = 'approved', updated_at = NOW() WHERE id = $1`,
    [Number(draftId)]
  );
}

async function main(): Promise<void> {
  const draftId = process.env['DRAFT_ID'];
  if (!draftId) {
    console.error('DRAFT_ID environment variable is required.');
    process.exit(1);
  }

  try {
    const draft = await getDraft(draftId);

    if (draft.status === 'published') {
      console.error(`Draft ${draftId} is already published — nothing to do.`);
      process.exit(1);
    }

    if (draft.status === 'rejected') {
      console.error(`Draft ${draftId} was rejected and cannot be published.`);
      process.exit(1);
    }

    if (draft.status !== 'pending_approval' && draft.status !== 'approved') {
      console.error(`Draft ${draftId} has unexpected status "${draft.status}". Expected pending_approval or approved.`);
      process.exit(1);
    }

    await setDraftApproved(draftId);

    const postRecord = await publishDraftPost(draftId);
    await scheduleEngagementSnapshot(postRecord.id);

    const facebookPostUrl = postRecord.facebookPostId
      ? `https://www.facebook.com/${postRecord.facebookPostId}`
      : '(URL not available)';

    await notifySlack({
      event: 'published',
      facebookPostUrl,
      excerpt: draft.body.slice(0, 200),
    });

    console.log(`Draft ${draftId} approved and published as Facebook post ${postRecord.facebookPostId}.`);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;

    console.error('Approve-post error:', errorMessage);

    await notifySlack({
      event: 'publish_failed',
      errorMessage,
      draftId,
    });
    await notifySlack({ event: 'pipeline_error', errorMessage, stack });
    process.exit(1);
  } finally {
    const pool = getPool();
    await pool.end();
  }
}

main().catch((err: unknown) => {
  console.error('Unhandled error in approve-post:', err);
  process.exit(1);
});
