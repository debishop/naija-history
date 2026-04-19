import * as https from 'https';
import * as http from 'http';

export type SlackEvent =
  | { event: 'run_start'; date: string; sourceUrl: string }
  | { event: 'approval_required'; draftId: string; body: string; hashtags: string[] }
  | { event: 'published'; facebookPostUrl: string; excerpt: string }
  | { event: 'publish_failed'; errorMessage: string; draftId: string }
  | { event: 'snapshot_recorded'; postRecordId: string; reactions: number; comments: number; shares: number; reach: number }
  | { event: 'pipeline_error'; errorMessage: string; stack?: string }
  | { event: 'token_age_warning'; days: number };

type SlackPayload = { text: string; blocks?: unknown[] };

function buildPayload(slackEvent: SlackEvent): SlackPayload {
  switch (slackEvent.event) {
    case 'run_start':
      return {
        text: `*Pipeline run started*\nDate: ${slackEvent.date}\nSource: ${slackEvent.sourceUrl}`,
      };

    case 'approval_required': {
      const hashtagLine = slackEvent.hashtags.map((h) => `#${h}`).join(' ');
      // Truncate body to keep the Slack message readable
      const bodyPreview = slackEvent.body.length > 600
        ? slackEvent.body.slice(0, 600) + '…'
        : slackEvent.body;
      return {
        text: `*Post requires approval* (draft ID: \`${slackEvent.draftId}\`)`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Post requires approval* (draft ID: \`${slackEvent.draftId}\`)\n\n${bodyPreview}`,
            },
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `Hashtags: ${hashtagLine}`,
              },
            ],
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: 'Approve & Publish', emoji: true },
                style: 'primary',
                action_id: 'approve_post',
                value: slackEvent.draftId,
                confirm: {
                  title: { type: 'plain_text', text: 'Publish this post?' },
                  text: { type: 'mrkdwn', text: 'This will publish the draft to the Facebook page.' },
                  confirm: { type: 'plain_text', text: 'Approve & Publish' },
                  deny: { type: 'plain_text', text: 'Cancel' },
                },
              },
              {
                type: 'button',
                text: { type: 'plain_text', text: 'Reject', emoji: true },
                style: 'danger',
                action_id: 'reject_post',
                value: slackEvent.draftId,
              },
            ],
          },
        ],
      };
    }

    case 'published':
      return {
        text: `*Post published* :white_check_mark:\n${slackEvent.facebookPostUrl}\n\n${slackEvent.excerpt}`,
      };

    case 'publish_failed':
      return {
        text: `*Publish failed* :x: (draft ID: \`${slackEvent.draftId}\`)\n${slackEvent.errorMessage}`,
      };

    case 'snapshot_recorded':
      return {
        text: (
          `*Engagement snapshot recorded* (post record: \`${slackEvent.postRecordId}\`)\n` +
          `Reactions: ${slackEvent.reactions} | Comments: ${slackEvent.comments} | Shares: ${slackEvent.shares} | Reach: ${slackEvent.reach}`
        ),
      };

    case 'pipeline_error':
      return {
        text: (
          `*Pipeline error* :rotating_light:\n${slackEvent.errorMessage}` +
          (slackEvent.stack ? `\n\`\`\`${slackEvent.stack.slice(0, 500)}\`\`\`` : '')
        ),
      };

    case 'token_age_warning':
      return {
        text: `*Facebook token age warning* :warning:\nToken is ${slackEvent.days} days old. Rotate before day 60.`,
      };
  }
}

function postToSlack(webhookUrl: string, payload: SlackPayload): Promise<void> {
  return new Promise((resolve) => {
    const body = JSON.stringify(payload);
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
          'Content-Length': Buffer.byteLength(body),
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

    req.write(body);
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
    const payload = buildPayload(slackEvent);
    await postToSlack(webhookUrl, payload);
  } catch (err) {
    console.error('[notifications] Failed to send Slack notification:', err instanceof Error ? err.message : String(err));
  }
}
