import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initSecrets } from '../../src/services/secrets';
import { checkTokenHealth } from '../../src/services/facebook';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('checkTokenHealth', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      FACEBOOK_SYSTEM_USER_TOKEN: 'test-token-123',
      FACEBOOK_PAGE_ID: '61577657207009',
      FACEBOOK_APP_ID: 'test-app-id',
      FACEBOOK_APP_SECRET: 'test-app-secret',
    };
    initSecrets();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns valid result when debug_token reports valid token with all scopes', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          app_id: 'test-app-id',
          type: 'SYSTEM',
          is_valid: true,
          expires_at: 0,
          scopes: ['pages_manage_posts', 'pages_read_engagement', 'pages_show_list'],
        },
      }),
    });

    const result = await checkTokenHealth();

    expect(result.valid).toBe(true);
    expect(result.missingScopes).toEqual([]);
    expect(result.error).toBeNull();
    expect(result.tokenType).toBe('SYSTEM');
  });

  it('reports missing scopes when token lacks required permissions', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          app_id: 'test-app-id',
          type: 'SYSTEM',
          is_valid: true,
          expires_at: 0,
          scopes: ['pages_show_list'],
        },
      }),
    });

    const result = await checkTokenHealth();

    expect(result.valid).toBe(true);
    expect(result.missingScopes).toEqual(['pages_manage_posts', 'pages_read_engagement']);
    expect(result.error).toContain('Missing required scopes');
  });

  it('returns invalid when debug_token says token is not valid', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          is_valid: false,
          error: { message: 'Token has expired', code: 190 },
        },
      }),
    });

    const result = await checkTokenHealth();

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Token has expired');
  });

  it('falls back to /me endpoint when app credentials are missing', async () => {
    delete process.env['FACEBOOK_APP_ID'];
    delete process.env['FACEBOOK_APP_SECRET'];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: '123', name: 'Test User' }),
    });

    const result = await checkTokenHealth();

    expect(result.valid).toBe(true);
    expect(result.tokenType).toBe('unknown');
  });

  it('returns invalid when /me fallback fails', async () => {
    delete process.env['FACEBOOK_APP_ID'];
    delete process.env['FACEBOOK_APP_SECRET'];

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({
        error: { message: 'Invalid OAuth access token', type: 'OAuthException', code: 190 },
      }),
    });

    const result = await checkTokenHealth();

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid OAuth access token');
  });

  it('parses expiry timestamp correctly', async () => {
    const futureTimestamp = Math.floor(Date.now() / 1000) + 86400 * 30;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          is_valid: true,
          type: 'USER',
          expires_at: futureTimestamp,
          scopes: ['pages_manage_posts', 'pages_read_engagement', 'pages_show_list'],
        },
      }),
    });

    const result = await checkTokenHealth();

    expect(result.valid).toBe(true);
    expect(result.expiresAt).toBeInstanceOf(Date);
    expect(result.expiresAt!.getTime()).toBe(futureTimestamp * 1000);
  });
});
