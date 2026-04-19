import * as dotenv from 'dotenv';
dotenv.config();

import { getNextSourceUrl } from '../core/sourceRotator';
import { fetchStory } from '../core/research';
import { generatePost } from '../core/contentGeneration';
import { publishDraftPost, scheduleEngagementSnapshot } from '../core/publisher';
import { notifySlack } from '../services/notifications';
import { getPool } from '../db/pool';

const APPROVAL_THRESHOLD = parseInt(process.env['APPROVAL_THRESHOLD'] ?? '20', 10);

interface PublishedCountRow {
  count: string;
}

interface DraftStatusRow {
  id: number;
}

async function getPublishedCount(): Promise<number> {
  const pool = getPool();
  const result = await pool.query<PublishedCountRow>(
    `SELECT COUNT(*) AS count FROM post_records WHERE status = 'published'`
  );
  return parseInt(result.rows[0]?.count ?? '0', 10);
}

async function setDraftStatus(draftId: string, status: string): Promise<void> {
  const pool = getPool();
  await pool.query<DraftStatusRow>(
    `UPDATE draft_posts SET status = $1, updated_at = NOW() WHERE id = $2`,
    [status, Number(draftId)]
  );
}

async function main(): Promise<void> {
  const date = new Date().toISOString().slice(0, 10);
  let sourceUrl = '';

  try {
    sourceUrl = await getNextSourceUrl();

    await notifySlack({ event: 'run_start', date, sourceUrl });

    const story = await fetchStory(sourceUrl);
    const draft = await generatePost(story);

    const publishedCount = await getPublishedCount();

    if (publishedCount < APPROVAL_THRESHOLD) {
      await setDraftStatus(draft.id, 'pending_approval');

      await notifySlack({
        event: 'approval_required',
        draftId: draft.id,
        body: draft.body,
        hashtags: draft.hashtags,
      });

      console.log(`Draft ${draft.id} is pending approval (${publishedCount}/${APPROVAL_THRESHOLD} published so far).`);
    } else {
      await setDraftStatus(draft.id, 'approved');
      const postRecord = await publishDraftPost(draft.id);
      await scheduleEngagementSnapshot(postRecord.id);

      const facebookPostUrl = postRecord.facebookPostId
        ? `https://www.facebook.com/${postRecord.facebookPostId}`
        : '(URL not available)';

      await notifySlack({
        event: 'published',
        facebookPostUrl,
        excerpt: draft.body.slice(0, 200),
      });

      console.log(`Draft ${draft.id} published as Facebook post ${postRecord.facebookPostId}.`);
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;

    console.error('Pipeline error:', errorMessage);

    await notifySlack({ event: 'pipeline_error', errorMessage, stack });
    process.exit(1);
  } finally {
    const pool = getPool();
    await pool.end();
  }
}

main().catch((err: unknown) => {
  console.error('Unhandled error in run-pipeline:', err);
  process.exit(1);
});
