import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';

vi.mock('../../src/db/pool', () => ({
  getPool: vi.fn().mockReturnValue({ query: vi.fn() }),
}));

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return { ...actual, readFileSync: vi.fn() };
});

import { getNextSourceUrl } from '../../src/core/sourceRotator';
import { getPool } from '../../src/db/pool';

const mockGetPool = vi.mocked(getPool);
const mockReadFileSync = vi.mocked(fs.readFileSync);

const SEED_DATA = [
  { url: 'https://bbc.com/article-a', domain: 'bbc.com', title: 'Article A' },
  { url: 'https://bbc.com/article-b', domain: 'bbc.com', title: 'Article B' },
  { url: 'https://bbc.com/article-c', domain: 'bbc.com', title: 'Article C' },
];

describe('getNextSourceUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadFileSync.mockReturnValue(JSON.stringify(SEED_DATA));
  });

  it('returns the first seed URL when none have been fetched', async () => {
    const mockQuery = vi.fn().mockResolvedValue({ rows: [] });
    mockGetPool.mockReturnValue({ query: mockQuery } as unknown as ReturnType<typeof getPool>);

    const url = await getNextSourceUrl();
    expect(url).toBe('https://bbc.com/article-a');
  });

  it('skips already-fetched URLs and returns the next unseeded URL', async () => {
    const mockQuery = vi.fn().mockResolvedValue({
      rows: [
        { source_url: 'https://bbc.com/article-a' },
        { source_url: 'https://bbc.com/article-b' },
      ],
    });
    mockGetPool.mockReturnValue({ query: mockQuery } as unknown as ReturnType<typeof getPool>);

    const url = await getNextSourceUrl();
    expect(url).toBe('https://bbc.com/article-c');
  });

  it('throws a descriptive error when all seeds are exhausted', async () => {
    const mockQuery = vi.fn().mockResolvedValue({
      rows: SEED_DATA.map((s) => ({ source_url: s.url })),
    });
    mockGetPool.mockReturnValue({ query: mockQuery } as unknown as ReturnType<typeof getPool>);

    await expect(getNextSourceUrl()).rejects.toThrow('All 3 seed URLs have already been fetched');
    await expect(getNextSourceUrl()).rejects.toThrow('article-seeds.json');
  });
});
