import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { contentHash } from '../../src/core/research';

// ---------------------------------------------------------------
// contentHash
// ---------------------------------------------------------------
describe('contentHash', () => {
  it('returns a 64-char hex SHA-256 digest', () => {
    const hash = contentHash('hello world');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it('is deterministic', () => {
    expect(contentHash('same text')).toBe(contentHash('same text'));
  });

  it('differs for different inputs', () => {
    expect(contentHash('text A')).not.toBe(contentHash('text B'));
  });
});

// ---------------------------------------------------------------
// fetchStory — whitelist enforcement
// ---------------------------------------------------------------
describe('fetchStory — whitelist enforcement', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects a non-whitelisted URL immediately, without fetching', async () => {
    const fetchArticleMock = vi.fn();

    vi.doMock('../../src/services/fetcher', () => ({
      fetchArticle: fetchArticleMock,
    }));

    const { fetchStory } = await import('../../src/core/research');

    await expect(fetchStory('https://evil-spam.com/article')).rejects.toThrow(
      'Domain not whitelisted'
    );
    expect(fetchArticleMock).not.toHaveBeenCalled();
  });

  it('accepts a whitelisted URL and calls the fetcher', async () => {
    const mockArticle = {
      title: 'Test Article',
      summary: 'First 500 chars',
      rawText: 'Full article text',
      publishedAt: null,
    };

    const fetchArticleMock = vi.fn().mockResolvedValue(mockArticle);
    const mockPool = {
      query: vi
        .fn()
        // First call: dedup check → no existing rows
        .mockResolvedValueOnce({ rows: [] })
        // Second call: INSERT → return new row
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              title: 'Test Article',
              summary: 'First 500 chars',
              source_url: 'https://bbc.com/news/article',
              source_name: 'BBC',
              published_at: null,
              raw_content: 'Full article text',
              fetched_at: new Date('2026-04-19T00:00:00Z'),
            },
          ],
        }),
    };

    vi.doMock('../../src/services/fetcher', () => ({
      fetchArticle: fetchArticleMock,
    }));
    vi.doMock('../../src/db/pool', () => ({
      getPool: () => mockPool,
    }));

    const { fetchStory } = await import('../../src/core/research');

    const result = await fetchStory('https://bbc.com/news/article');

    expect(fetchArticleMock).toHaveBeenCalledWith('https://bbc.com/news/article');
    expect(result.title).toBe('Test Article');
    expect(result.sourceName).toBe('BBC');
    expect(result.id).toBe('1');
  });
});

// ---------------------------------------------------------------
// fetchStory — dedup
// ---------------------------------------------------------------
describe('fetchStory — dedup', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the existing record when content hash matches, without inserting', async () => {
    const existingRow = {
      id: 42,
      title: 'Existing Article',
      summary: 'Previously fetched',
      source_url: 'https://reuters.com/article/nigeria',
      source_name: 'Reuters',
      published_at: null,
      raw_content: 'Full text here',
      fetched_at: new Date('2026-04-18T00:00:00Z'),
    };

    const mockArticle = {
      title: 'Existing Article',
      summary: 'Previously fetched',
      rawText: 'Full text here',
      publishedAt: null,
    };

    const fetchArticleMock = vi.fn().mockResolvedValue(mockArticle);
    const mockQuery = vi
      .fn()
      // Dedup check returns an existing row
      .mockResolvedValueOnce({ rows: [existingRow] });

    vi.doMock('../../src/services/fetcher', () => ({
      fetchArticle: fetchArticleMock,
    }));
    vi.doMock('../../src/db/pool', () => ({
      getPool: () => ({ query: mockQuery }),
    }));

    const { fetchStory } = await import('../../src/core/research');

    const result = await fetchStory('https://reuters.com/article/nigeria');

    // Only the SELECT should have been called (no INSERT)
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(result.id).toBe('42');
    expect(result.title).toBe('Existing Article');
  });
});
