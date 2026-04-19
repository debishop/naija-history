import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/db/pool', () => ({
  getPool: vi.fn().mockReturnValue({ query: vi.fn() }),
}));

vi.mock('../../src/services/facebook', () => ({
  getPostEngagement: vi.fn(),
}));

import { snapshotEngagement } from '../../src/core/analytics';
import { getPool } from '../../src/db/pool';
import { getPostEngagement } from '../../src/services/facebook';

const mockGetPool = vi.mocked(getPool);
const mockGetPostEngagement = vi.mocked(getPostEngagement);

const POST_RECORD_ROW = {
  id: 1,
  facebook_post_id: 'fb_post_123',
  published_at: new Date('2024-01-01T12:00:00Z'),
};

const ENGAGEMENT_ROW = {
  id: 10,
  post_record_id: 1,
  facebook_post_id: 'fb_post_123',
  likes: 42,
  comments: 5,
  shares: 7,
  reach: 500,
  snapshot_at: new Date('2024-01-03T12:00:00Z'),
};

const RAW_ENGAGEMENT = {
  reactions: 42,
  comments: 5,
  shares: 7,
  reach: 500,
};

describe('snapshotEngagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws if PostRecord not found', async () => {
    const mockQuery = vi.fn().mockResolvedValueOnce({ rows: [] });
    mockGetPool.mockReturnValue({ query: mockQuery } as unknown as ReturnType<typeof getPool>);

    await expect(snapshotEngagement('99')).rejects.toThrow('PostRecord with id 99 not found');
  });

  it('throws if PostRecord has no facebook_post_id', async () => {
    const rowWithoutFbId = { ...POST_RECORD_ROW, facebook_post_id: null };
    const mockQuery = vi.fn().mockResolvedValueOnce({ rows: [rowWithoutFbId] });
    mockGetPool.mockReturnValue({ query: mockQuery } as unknown as ReturnType<typeof getPool>);

    await expect(snapshotEngagement('1')).rejects.toThrow('has no facebook_post_id');
  });

  it('fetches engagement and persists EngagementRecord', async () => {
    mockGetPostEngagement.mockResolvedValue(RAW_ENGAGEMENT);

    const mockQuery = vi
      .fn()
      .mockResolvedValueOnce({ rows: [POST_RECORD_ROW] })   // SELECT post_records
      .mockResolvedValueOnce({ rows: [ENGAGEMENT_ROW] });   // INSERT engagement_records

    mockGetPool.mockReturnValue({ query: mockQuery } as unknown as ReturnType<typeof getPool>);

    const record = await snapshotEngagement('1');

    expect(mockGetPostEngagement).toHaveBeenCalledWith('fb_post_123');

    expect(record.postRecordId).toBe('1');
    expect(record.facebookPostId).toBe('fb_post_123');
    expect(record.reactions).toBe(42);
    expect(record.comments).toBe(5);
    expect(record.shares).toBe(7);
    expect(record.reach).toBe(500);
    expect(record.snapshotAt).toBeInstanceOf(Date);

    // Verify INSERT was called with correct params
    const insertCall = mockQuery.mock.calls[1] as [string, unknown[]];
    expect(insertCall[0]).toContain('INSERT INTO engagement_records');
    expect(insertCall[1][0]).toBe(1);                // post_record_id
    expect(insertCall[1][1]).toBe('fb_post_123');     // facebook_post_id
    expect(insertCall[1][2]).toBe(42);               // likes (reactions)
    expect(insertCall[1][3]).toBe(5);                // comments
    expect(insertCall[1][4]).toBe(7);                // shares
    expect(insertCall[1][5]).toBe(500);              // reach
  });

  it('propagates Graph API errors from getPostEngagement', async () => {
    const apiError = new Error('Graph API error: Invalid token');
    mockGetPostEngagement.mockRejectedValue(apiError);

    const mockQuery = vi.fn().mockResolvedValueOnce({ rows: [POST_RECORD_ROW] });
    mockGetPool.mockReturnValue({ query: mockQuery } as unknown as ReturnType<typeof getPool>);

    await expect(snapshotEngagement('1')).rejects.toThrow('Invalid token');
  });
});
