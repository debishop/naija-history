import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { findAffiliateMatch, buildAffiliateFooter, resetAffiliateLinkCache } from '../../src/services/affiliateLinks';

vi.mock('fs');

const mockReadFileSync = vi.mocked(readFileSync);

const TEST_CONFIG = {
  biafra: { title: 'There Was a Country', url: 'https://amzn.to/test_biafra' },
  'nigeria civil war': { title: 'There Was a Country', url: 'https://amzn.to/test_biafra' },
  benin: { title: 'The Benin Bronzes', url: 'https://amzn.to/test_benin' },
  nok: { title: 'Nok Sculptures', url: 'https://amzn.to/test_nok' },
};

function setupMockConfig(config: Record<string, { title: string; url: string }> = TEST_CONFIG) {
  mockReadFileSync.mockReturnValue(JSON.stringify(config) as unknown as Buffer);
}

describe('findAffiliateMatch', () => {
  beforeEach(() => {
    resetAffiliateLinkCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetAffiliateLinkCache();
  });

  it('returns null when no keyword matches', () => {
    setupMockConfig();
    const result = findAffiliateMatch('A post about the Lagos skyline and modern architecture.');
    expect(result).toBeNull();
  });

  it('matches a single keyword (case-insensitive)', () => {
    setupMockConfig();
    const result = findAffiliateMatch('The Biafra war changed Nigeria forever.');
    expect(result).toEqual({ title: 'There Was a Country', url: 'https://amzn.to/test_biafra' });
  });

  it('matches regardless of post body case', () => {
    setupMockConfig();
    const result = findAffiliateMatch('THE BIAFRA CONFLICT AND ITS AFTERMATH.');
    expect(result).toEqual({ title: 'There Was a Country', url: 'https://amzn.to/test_biafra' });
  });

  it('prefers longer keyword matches over shorter ones', () => {
    setupMockConfig();
    // "nigeria civil war" is longer than "biafra" and appears in the body
    const result = findAffiliateMatch('The Nigeria Civil War left deep scars.');
    expect(result).toEqual({ title: 'There Was a Country', url: 'https://amzn.to/test_biafra' });
    expect(result?.url).toBe('https://amzn.to/test_biafra');
  });

  it('returns the correct link for "benin" keyword', () => {
    setupMockConfig();
    const result = findAffiliateMatch('The Kingdom of Benin was a powerful empire in West Africa.');
    expect(result).toEqual({ title: 'The Benin Bronzes', url: 'https://amzn.to/test_benin' });
  });

  it('returns null when config file cannot be read', () => {
    mockReadFileSync.mockImplementation(() => { throw new Error('ENOENT'); });
    const result = findAffiliateMatch('Post about Biafra.');
    expect(result).toBeNull();
  });

  it('returns null for empty config', () => {
    setupMockConfig({});
    const result = findAffiliateMatch('Post about Biafra.');
    expect(result).toBeNull();
  });

  it('caches config after first load', () => {
    setupMockConfig();
    findAffiliateMatch('Post about Biafra.');
    findAffiliateMatch('Another post about Nok.');
    expect(mockReadFileSync).toHaveBeenCalledTimes(1);
  });
});

describe('buildAffiliateFooter', () => {
  it('formats the footer correctly', () => {
    const footer = buildAffiliateFooter({ title: 'There Was a Country', url: 'https://amzn.to/test' });
    expect(footer).toBe('📚 Want to learn more? There Was a Country — https://amzn.to/test');
  });
});
