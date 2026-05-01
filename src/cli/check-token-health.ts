import * as dotenv from 'dotenv';
dotenv.config();

import { initSecrets } from '../services/secrets';
import { checkTokenHealth } from '../services/facebook';
import { notifySlack } from '../services/notifications';

const TOKEN_AGE_WARN_DAYS = 50;

function checkTokenAge(): { ageDays: number | null; warning: boolean } {
  const tokenCreatedAt = process.env['FACEBOOK_TOKEN_CREATED_AT'];
  if (!tokenCreatedAt) return { ageDays: null, warning: false };

  const created = new Date(tokenCreatedAt);
  if (isNaN(created.getTime())) {
    console.warn('[token-health] FACEBOOK_TOKEN_CREATED_AT is not a valid date');
    return { ageDays: null, warning: false };
  }

  const ageDays = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
  return { ageDays, warning: ageDays > TOKEN_AGE_WARN_DAYS };
}

async function main(): Promise<void> {
  initSecrets();

  console.log('[token-health] Running Facebook token health check...');

  const result = await checkTokenHealth();
  const { ageDays, warning: ageWarning } = checkTokenAge();

  if (ageDays !== null) {
    console.log(`[token-health] Token age: ${ageDays} days`);
  }

  if (result.valid && result.missingScopes.length === 0) {
    console.log('[token-health] Token is valid');
    console.log(`[token-health] Type: ${result.tokenType ?? 'unknown'}`);
    console.log(`[token-health] Scopes: ${result.scopes.join(', ') || 'unknown'}`);

    if (result.expiresAt) {
      console.log(`[token-health] Expires: ${result.expiresAt.toISOString()}`);
    }

    await notifySlack({
      event: 'token_health_ok',
      tokenType: result.tokenType ?? 'unknown',
      expiresAt: result.expiresAt?.toISOString() ?? null,
      scopes: result.scopes,
    });

    if (ageWarning && ageDays !== null) {
      console.warn(`[token-health] Token is ${ageDays} days old — approaching 60-day expiry`);
      await notifySlack({ event: 'token_age_warning', days: ageDays });
    }
  } else {
    const errorMsg = result.error ?? 'Token validation failed';
    console.error(`[token-health] FAILED: ${errorMsg}`);

    if (result.missingScopes.length > 0) {
      console.error(`[token-health] Missing scopes: ${result.missingScopes.join(', ')}`);
    }

    await notifySlack({
      event: 'token_health_failed',
      error: errorMsg,
      missingScopes: result.missingScopes,
    });

    process.exitCode = 1;
  }
}

main().catch((err: unknown) => {
  console.error('Unhandled error in check-token-health:', err);
  process.exit(1);
});
