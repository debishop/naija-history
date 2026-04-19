import * as https from 'https';
import * as http from 'http';

export type SlackEvent =
  | { event: 'run_start'; date: string; sourceUrl: string }
  | { event: 'approval_required'; draftId: string; body: string; hashtags: string[]; approvalUrl: string }
  | { event: 'published'; facebookPostUrl: string; excerpt: string }
  | { event: 'publish_failed'; errorMessage: string; draftId: string }
  | { event: 'snapshot_recorded'; postRecordId: string; reactions: number; comments: number; shares: number; reach: number }
  | { event: 'pipeline_error'; errorMessage: string; stack?: string }
  | { event: 'token_age_warning'; days: number };

function buildMessage(slackEvent: SlackEvent): string {
  switch (slackEvent.event) {
    case 'run_start':
      return `*Pipeline run started*\nDate: ${slackEvent.date}\nSource: ${slackEvent.sourceUrl}`;

    case 'approval_required':
      return (
        `*Post requires approval* (draft ID: \`${slackEvent.draftId}\`)\n\n` +
        `${slackEvent.body}\n\n` +
        `Hashtags: ${slackEvent.hashtags.map((h) => `#${h}`).join(' ')}\n\n` +
        `To approve, open: ${slackEvent.approvalUrl}`
      );

    case 'published':
      return `*Post published* :white_check_mark:\n${slackEvent.facebookPostUrl}\n\n${slackEvent.excerpt}`;

    case 'publish_failed':
      return `*Publish failed* :x: (draft ID: \`${slackEvent.draftId}\`)\n${slackEvent.errorMessage}`;

    case 'snapshot_recorded':
      return (
        `*Engagement snapshot recorded* (post record: \`${slackEvent.postRecordId}\`)\n` +
        `Reactions: ${slackEvent.reactions} | Comments: ${slackEvent.comments} | Shares: ${slackEvent.shares} | Reach: ${slackEvent.reach}`
      );

    case 'pipeline_error':
      return (
        `*Pipeline error* :rotating_light:\n${slackEvent.errorMessage}` +
        (slackEvent.stack ? `\n\`\`\`${slackEvent.stack.slice(0, 500)}\`\`\`` : '')
      );

    case 'token_age_warning':
      return `*Facebook token age warning* :warning:\nToken is ${slackEvent.days} days old. Rotate before day 60.`;
  }
}

function postToSlack(webhookUrl: string, text: string): Promise<void> {
  return new Promise((resolve) => {
    const payload = JSON.stringify({ text });
    const url = new URL(webhookUrl);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;

    const req = lib.request(
      {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        res.resume();
        if (res.statusCode && res.statusCode >= 400) {
          console.error(`[notifications] Slack webhook returned HTTP ${res.statusCode}`);
        }
        resolve();
      }
    );

    req.on('error', (err) => {
      console.error('[notifications] Slack webhook request failed:', err.message);
      resolve();
    });

    req.write(payload);
    req.end();
  });
}

/**
 * Sends a Slack notification for a pipeline event.
 * Fire-and-forget: failures are logged but never thrown.
 */
export async function notifySlack(slackEvent: SlackEvent): Promise<void> {
  const webhookUrl = process.env['SLACK_WEBHOOK_URL'];
  if (!webhookUrl) {
    console.warn('[notifications] SLACK_WEBHOOK_URL not set — skipping notification');
    return;
  }

  try {
    const text = buildMessage(slackEvent);
    await postToSlack(webhookUrl, text);
  } catch (err) {
    console.error('[notifications] Failed to send Slack notification:', err instanceof Error ? err.message : String(err));
  }
}
