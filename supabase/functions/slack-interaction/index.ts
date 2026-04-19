/**
 * Supabase Edge Function: slack-interaction
 *
 * Receives Slack interactive component payloads (button clicks) for the
 * Nigeria History Pipeline approval flow. Validates the request signature,
 * then either triggers the GitHub Actions publish workflow (approve) or
 * marks the draft as rejected in the database (reject).
 *
 * Required environment variables (set via Doppler → Supabase secrets sync):
 *   SLACK_SIGNING_SECRET       — from Slack app "Basic Information" page
 *   GITHUB_TOKEN               — PAT with actions:write scope
 *   GITHUB_OWNER               — GitHub repo owner (user or org)
 *   GITHUB_REPO                — GitHub repo name
 *   SUPABASE_URL               — auto-injected by Supabase runtime
 *   SUPABASE_SERVICE_ROLE_KEY  — auto-injected by Supabase runtime
 *
 * Deploy with:
 *   supabase functions deploy slack-interaction
 *
 * Then set the Slack app's Interactivity Request URL to:
 *   https://<project-ref>.supabase.co/functions/v1/slack-interaction
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SLACK_SIGNING_SECRET = Deno.env.get('SLACK_SIGNING_SECRET') ?? '';
const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN') ?? '';
const GITHUB_OWNER = Deno.env.get('GITHUB_OWNER') ?? '';
const GITHUB_REPO = Deno.env.get('GITHUB_REPO') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

// ---------------------------------------------------------------------------
// Slack signature verification (HMAC-SHA256)
// ---------------------------------------------------------------------------

async function verifySlackSignature(request: Request, rawBody: string): Promise<boolean> {
  const timestamp = request.headers.get('X-Slack-Request-Timestamp') ?? '';
  const signature = request.headers.get('X-Slack-Signature') ?? '';

  if (!timestamp || !signature) return false;

  // Reject replays older than 5 minutes
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp, 10)) > 300) return false;

  const sigBaseString = `v0:${timestamp}:${rawBody}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(SLACK_SIGNING_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signatureBytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(sigBaseString));
  const expectedSig =
    'v0=' +
    Array.from(new Uint8Array(signatureBytes))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

  // Constant-time comparison to avoid timing attacks
  if (expectedSig.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expectedSig.length; i++) {
    mismatch |= expectedSig.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

async function triggerPublishWorkflow(draftId: string): Promise<void> {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/publish-approved.yml/dispatches`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({ ref: 'main', inputs: { draft_id: draftId } }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`GitHub workflow dispatch failed (${response.status}): ${detail}`);
  }
}

async function rejectDraft(draftId: string): Promise<void> {
  const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { error } = await client
    .from('draft_posts')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('id', parseInt(draftId, 10));
  if (error) throw new Error(`Failed to reject draft ${draftId}: ${error.message}`);
}

async function respondToSlack(responseUrl: string, text: string, replaceOriginal = true): Promise<void> {
  await fetch(responseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ replace_original: replaceOriginal, text }),
  });
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const rawBody = await req.text();

  const valid = await verifySlackSignature(req, rawBody);
  if (!valid) {
    console.error('[slack-interaction] Invalid Slack signature');
    return new Response('Unauthorized', { status: 401 });
  }

  const params = new URLSearchParams(rawBody);
  const payloadStr = params.get('payload') ?? '';

  let payload: {
    actions?: Array<{ action_id: string; value: string }>;
    response_url?: string;
  };
  try {
    payload = JSON.parse(payloadStr);
  } catch {
    return new Response('Bad request: invalid payload JSON', { status: 400 });
  }

  const action = payload.actions?.[0];
  if (!action) {
    return new Response('Bad request: no action found', { status: 400 });
  }

  const { action_id, value: draftId } = action;
  const responseUrl = payload.response_url ?? '';

  console.log(`[slack-interaction] action_id=${action_id} draftId=${draftId}`);

  try {
    if (action_id === 'approve_post') {
      await triggerPublishWorkflow(draftId);
      if (responseUrl) {
        await respondToSlack(
          responseUrl,
          `:white_check_mark: *Approved* — queuing draft \`${draftId}\` for publishing via GitHub Actions.`,
        );
      }
    } else if (action_id === 'reject_post') {
      await rejectDraft(draftId);
      if (responseUrl) {
        await respondToSlack(
          responseUrl,
          `:x: *Rejected* — draft \`${draftId}\` has been marked as rejected.`,
        );
      }
    } else {
      console.warn(`[slack-interaction] Unknown action_id: ${action_id}`);
      return new Response('Unknown action', { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[slack-interaction] Error:', message);
    if (responseUrl) {
      await respondToSlack(responseUrl, `:rotating_light: Error processing action: ${message}`, false);
    }
    return new Response('Internal error', { status: 500 });
  }

  // Slack requires a 200 within 3 seconds; we've already responded via response_url
  return new Response('', { status: 200 });
});
