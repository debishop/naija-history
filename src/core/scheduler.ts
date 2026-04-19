import cron from 'node-cron';
import { snapshotEngagement } from './analytics';

const DEFAULT_DELAY_HOURS = 48;

/**
 * Schedules a one-shot engagement snapshot for a PostRecord.
 *
 * Fires `snapshotEngagement` at `publishedAt + delayHours` (default 48 h).
 * For local dev testing, set env var ENGAGEMENT_SNAPSHOT_DELAY_MINUTES to override
 * with a short delay (e.g. ENGAGEMENT_SNAPSHOT_DELAY_MINUTES=1 fires after 1 minute).
 */
export function scheduleEngagementSnapshot(
  postRecordId: string,
  publishedAt: Date,
  delayHours: number = DEFAULT_DELAY_HOURS
): void {
  const delayMinutesOverride = process.env['ENGAGEMENT_SNAPSHOT_DELAY_MINUTES'];
  const targetTime =
    delayMinutesOverride !== undefined
      ? new Date(Date.now() + Number(delayMinutesOverride) * 60 * 1000)
      : new Date(publishedAt.getTime() + delayHours * 60 * 60 * 1000);

  const cronExpr = [
    targetTime.getMinutes(),
    targetTime.getHours(),
    targetTime.getDate(),
    targetTime.getMonth() + 1,
    '*',
  ].join(' ');

  console.log(
    `[scheduler] Engagement snapshot for PostRecord ${postRecordId} scheduled at ${targetTime.toISOString()} (cron: ${cronExpr})`
  );

  const task = cron.schedule(cronExpr, () => {
    task.stop();
    snapshotEngagement(postRecordId)
      .then((record) => {
        console.log(
          `[scheduler] Engagement snapshot recorded for PostRecord ${postRecordId}: reactions=${record.reactions} comments=${record.comments} shares=${record.shares} reach=${record.reach}`
        );
      })
      .catch((err: unknown) => {
        console.error(
          `[scheduler] Failed to snapshot engagement for PostRecord ${postRecordId}:`,
          err
        );
      });
  });
}
