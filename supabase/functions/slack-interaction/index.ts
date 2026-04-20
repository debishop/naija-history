/**
 * Supabase Edge Function: slack-interaction
 *
 * Receives Slack interactive component payloads (button clicks) for the
 * Nigeria History Pipeline approval flow. Validates the request signature,
 * then either triggers the GitHub Actions publish workflow (approve) or
 * marks the draft as rejected in the database (reject).
 *
 * Required environment variable (set via `supabase secrets set`):
 *   DOPPLER_TOKEN  — service token for the Doppler nigeria-history-pipeline/production config
 *
 * All other secrets (SLACK_SIGNING_SECRET, GITHUB_TOKEN, GITHUB_OWNER,
 * GITHUB_REPO, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) are fetched from
 * Doppler at cold-start and cached for the lifetime of the function instance.
 *
 * Deploy with:
 *   supabase secrets set DOPPLER_TOKEN=<service-token>
 *   supabase functions deploy slack-interaction
 *
 * Then set the Slack app's Interactivity Request URL to:
 *   https://<project-ref>.supabase.co/functions/v1/slack-interaction
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ---------------------------------------------------------------------------
// Doppler — load all secrets once per cold start
// ---------------------------------------------------------------------------

interface DopplerSecret {
  computed: string;
}

let cachedSecrets: Record<string, string> | null = null;

async function loadSecrets(): Promise<Record<string, string>> {
  if (cachedSecrets) return cachedSecrets;

  const token = Deno.env.get('DOPPLER_TOKEN') ?? '';
  if (!token) throw new Error('DOPPLER_TOKEN env var is not set');

  const res = await fetch(
    'https://api.doppler.com/v3/configs/config/secrets/download?format=json',
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Doppler secrets fetch failed (${res.status}): ${body}`);
  }

  const raw: Record<string, DopplerSecret> = await res.json();
  cachedSecrets = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, v.computed]),
  );
  return cachedSecrets;
}

// ---------------------------------------------------------------------------
// Slack signature verification (HMAC-SHA256)
// ---------------------------------------------------------------------------

async function verifySlackSignature(
  request: Request,
  rawBody: string,
  signingSecret: string,
): Promise<boolean> {
  const timestamp = request.headers.get('X-Slack-Request-Timestamp') ?? '';
  const signature = request.headers.get('X-Slack-Signature') ?? '';

  if (!timestamp || !signature) return false;

  // Reject replays older than 5 minutes
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp, 10)) > 300) return false;

  const sigBaseString = `v0:${timestamp}:${rawBody}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(signingSecret),
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

async function triggerPublishWorkflow(
  draftId: string,
  githubToken: string,
  githubOwner: string,
  githubRepo: string,
): Promise<void> {
  const url = `https://api.github.com/repos/${githubOwner}/${githubRepo}/actions/workflows/publish-approved.yml/dispatches`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${githubToken}`,
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

async function rejectDraft(
  draftId: string,
  supabaseUrl: string,
  supabaseServiceRoleKey: string,
): Promise<void> {
  const client = createClient(supabaseUrl, supabaseServiceRoleKey);
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

  let secrets: Record<string, string>;
  try {
    secrets = await loadSecrets();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[slack-interaction] Failed to load secrets from Doppler:', message);
    return new Response('Service unavailable', { status: 503 });
  }

  const SLACK_SIGNING_SECRET = secrets.SLACK_SIGNING_SECRET ?? '';
  const GITHUB_TOKEN = secrets.GITHUB_TOKEN ?? '';
  const GITHUB_OWNER = secrets.GITHUB_OWNER ?? '';
  const GITHUB_REPO = secrets.GITHUB_REPO ?? '';
  const SUPABASE_URL = secrets.SUPABASE_URL ?? '';
  const SUPABASE_SERVICE_ROLE_KEY = secrets.SUPABASE_SERVICE_ROLE_KEY ?? '';

  const rawBody = await req.text();

  const valid = await verifySlackSignature(req, rawBody, SLACK_SIGNING_SECRET);
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
      await triggerPublishWorkflow(draftId, GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO);
      if (responseUrl) {
        await respondToSlack(
          responseUrl,
          `:white_check_mark: *Approved* — queuing draft \`${draftId}\` for publishing via GitHub Actions.`,
        );
      }
    } else if (action_id === 'reject_post') {
      await rejectDraft(draftId, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
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
