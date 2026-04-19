/**
 * Secrets client — reads from environment variables that hold secret paths/values.
 *
 * Convention: secrets are stored in a secrets manager (e.g. AWS Secrets Manager,
 * HashiCorp Vault). The env vars point to the secret paths. For local dev, env
 * vars directly hold mock/test values.
 *
 * IMPORTANT: This client NEVER falls back silently. If a required secret is
 * missing, it throws immediately so misconfigured environments fail loudly.
 */

export interface SecretsClient {
  get(key: string): string;
}

class EnvSecretsClient implements SecretsClient {
  get(key: string): string {
    const value = process.env[key];
    if (value === undefined || value === '') {
      throw new Error(
        `Required secret "${key}" is not set. ` +
          'Ensure it is configured in your secrets manager and the corresponding ' +
          'env var is populated before starting the application.'
      );
    }
    return value;
  }
}

let _client: SecretsClient | null = null;

export function initSecrets(client?: SecretsClient): void {
  _client = client ?? new EnvSecretsClient();
}

export function getSecrets(): SecretsClient {
  if (!_client) {
    throw new Error(
      'Secrets client has not been initialized. Call initSecrets() during app startup.'
    );
  }
  return _client;
}

/** Required secret keys — add new secrets here as modules are built. */
export const SECRET_KEYS = {
  FACEBOOK_APP_SECRET: 'FACEBOOK_APP_SECRET',
  FACEBOOK_PAGE_ACCESS_TOKEN: 'FACEBOOK_PAGE_ACCESS_TOKEN',
  DATABASE_URL: 'DATABASE_URL',
} as const;

export type SecretKey = (typeof SECRET_KEYS)[keyof typeof SECRET_KEYS];
