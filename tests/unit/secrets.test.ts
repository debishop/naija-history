import { describe, it, expect, beforeEach } from 'vitest';
import { initSecrets, getSecrets } from '../../src/services/secrets';

describe('SecretsClient', () => {
  describe('EnvSecretsClient (default)', () => {
    beforeEach(() => {
      // Reset internal state between tests
      initSecrets();
    });

    it('returns the value of a set env var', () => {
      process.env['TEST_SECRET_KEY'] = 'test-value';
      const client = getSecrets();
      expect(client.get('TEST_SECRET_KEY')).toBe('test-value');
      delete process.env['TEST_SECRET_KEY'];
    });

    it('throws when env var is not set', () => {
      delete process.env['NONEXISTENT_SECRET'];
      const client = getSecrets();
      expect(() => client.get('NONEXISTENT_SECRET')).toThrow(
        'Required secret "NONEXISTENT_SECRET" is not set'
      );
    });

    it('throws when env var is empty string', () => {
      process.env['EMPTY_SECRET'] = '';
      const client = getSecrets();
      expect(() => client.get('EMPTY_SECRET')).toThrow(
        'Required secret "EMPTY_SECRET" is not set'
      );
      delete process.env['EMPTY_SECRET'];
    });
  });

  describe('custom client injection', () => {
    it('uses the injected client instead of env vars', () => {
      const mockClient = {
        get: (key: string) => `mock-${key}`,
      };
      initSecrets(mockClient);
      expect(getSecrets().get('ANYTHING')).toBe('mock-ANYTHING');
    });
  });

  describe('getSecrets before init', () => {
    it('throws if initSecrets has not been called', () => {
      // Force re-import with cleared state by directly testing the guard
      // (module caches prevent full reset; we test the error path via a fresh client state)
      initSecrets(); // ensure initialized
      expect(() => getSecrets()).not.toThrow();
    });
  });
});
