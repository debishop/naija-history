import * as dotenv from 'dotenv';
dotenv.config();

import { snapshotEngagement } from '../core/analytics';
import { notifySlack } from '../services/notifications';
import { getPool } from '../db/pool';

interface OverdueRow {
  id: number;
  facebook_post_id: string;
}

const TOKEN_AGE_WARN_DAYS = 50;

async function getOverdueRecords(): Promise<OverdueRow[]> {
  const pool = getPool();
  const result = await pool.query<OverdueRow>(
    `SELECT id, facebook_post_id
     FROM post_records
     WHERE scheduled_snapshot_at <= NOW()
       AND snapshot_taken = false
       AND facebook_post_id IS NOT NULL`
  );
  return result.rows;
}

async function markSnapshotTaken(postRecordId: number): Promise<void> {
  const pool = getPool();
  await pool.query(
    `UPDATE post_records SET snapshot_taken = true WHERE id = $1`,
    [postRecordId]
  );
}

function checkTokenAge(): void {
  const tokenCreatedAt = process.env['FACEBOOK_TOKEN_CREATED_AT'];
  if (!tokenCreatedAt) return;

  const created = new Date(tokenCreatedAt);
  if (isNaN(created.getTime())) {
    console.warn('[check-snapshots] FACEBOOK_TOKEN_CREATED_AT is not a valid date — skipping token age check');
    return;
  }

  const ageMs = Date.now() - created.getTime();
  const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));

  if (ageDays > TOKEN_AGE_WARN_DAYS) {
    console.warn(`[check-snapshots] Facebook token is ${ageDays} days old — sending Slack warning`);
    // Fire-and-forget; do not await so it does not block the rest of the script
    notifySlack({ event: 'token_age_warning', days: ageDays }).catch((err) => {
      console.error('[check-snapshots] Failed to send token age warning:', err instanceof Error ? err.message : String(err));
    });
  }
}

async function main(): Promise<void> {
  const records = await getOverdueRecords();
  console.log(`[check-snapshots] Found ${records.length} overdue snapshot(s).`);

  for (const record of records) {
    try {
      const engagement = await snapshotEngagement(String(record.id));
      await markSnapshotTaken(record.id);

      await notifySlack({
        event: 'snapshot_recorded',
        postRecordId: String(record.id),
        reactions: engagement.reactions,
        comments: engagement.comments,
        shares: engagement.shares,
        reach: engagement.reach,
      });

      console.log(`[check-snapshots] Snapshot recorded for post record ${record.id}.`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[check-snapshots] Failed to snapshot post record ${record.id}:`, errorMessage);
      // Continue with remaining records — do not abort the batch
    }
  }

  checkTokenAge();
}

main()
  .catch((err: unknown) => {
    console.error('Unhandled error in check-snapshots:', err);
    process.exit(1);
  })
  .finally(async () => {
    const pool = getPool();
    await pool.end();
  });
