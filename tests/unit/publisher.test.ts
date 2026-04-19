import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/db/pool', () => ({
  getPool: vi.fn().mockReturnValue({ query: vi.fn() }),
}));

vi.mock('../../src/services/facebook', () => ({
  publishPost: vi.fn(),
  FacebookPublishError: class FacebookPublishError extends Error {
    graphError: { message: string; type: string; code: number };
    httpStatus: number;
    constructor(graphError: { message: string; type: string; code: number }, httpStatus: number) {
      super(`Facebook Graph API error (HTTP ${httpStatus}): ${graphError.message}`);
      this.name = 'FacebookPublishError';
      this.graphError = graphError;
      this.httpStatus = httpStatus;
    }
  },
}));

import { publishDraftPost } from '../../src/core/publisher';
import { getPool } from '../../src/db/pool';
import { publishPost, FacebookPublishError } from '../../src/services/facebook';

const mockGetPool = vi.mocked(getPool);
const mockPublishPost = vi.mocked(publishPost);
const MockFacebookPublishError = vi.mocked(FacebookPublishError);

const APPROVED_DRAFT_ROW = {
  id: 10,
  story_candidate_id: 5,
  body: 'Test post body #NigerianHistory #Africa',
  hashtags: ['NigerianHistory', 'Africa'],
  source_url: 'https://bbc.com/news/nigeria',
  source_name: 'BBC',
  status: 'approved',
  created_at: new Date('2024-01-01'),
};

const POST_RECORD_ROW = {
  id: 1,
  draft_post_id: 10,
  facebook_post_id: 'fb_post_123',
  published_at: new Date('2024-01-02'),
  status: 'published',
  error_message: null,
};

function makeQueryMock(draftRow: typeof APPROVED_DRAFT_ROW | null, postRecordRow = POST_RECORD_ROW) {
  return vi.fn()
    .mockResolvedValueOnce({ rows: draftRow ? [draftRow] : [] })   // loadDraftPost
    .mockResolvedValueOnce({ rows: [] })                             // markDraftPublished (UPDATE)
    .mockResolvedValueOnce({ rows: [postRecordRow] });               // writePostRecord (INSERT)
}

describe('publishDraftPost', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it('throws if draft post not found', async () => {
    const mockQuery = vi.fn().mockResolvedValueOnce({ rows: [] });
    mockGetPool.mockReturnValue({ query: mockQuery } as unknown as ReturnType<typeof getPool>);

    await expect(publishDraftPost('99')).rejects.toThrow('not found');
  });

  it('throws if draft post is not approved', async () => {
    const draftRow = { ...APPROVED_DRAFT_ROW, status: 'draft' };
    const mockQuery = vi.fn().mockResolvedValueOnce({ rows: [draftRow] });
    mockGetPool.mockReturnValue({ query: mockQuery } as unknown as ReturnType<typeof getPool>);

    await expect(publishDraftPost('10')).rejects.toThrow('only approved posts may be published');
  });

  it('publishes successfully and returns PostRecord', async () => {
    mockPublishPost.mockResolvedValue('fb_post_123');
    const mockQuery = makeQueryMock(APPROVED_DRAFT_ROW);
    mockGetPool.mockReturnValue({ query: mockQuery } as unknown as ReturnType<typeof getPool>);

    const record = await publishDraftPost('10');

    expect(mockPublishPost).toHaveBeenCalledOnce();
    expect(record.status).toBe('published');
    expect(record.facebookPostId).toBe('fb_post_123');
    expect(record.draftPostId).toBe('10');

    // Verify UPDATE draft_posts was called
    const updateCall = mockQuery.mock.calls[1] as [string, unknown[]];
    expect(updateCall[0]).toContain("status = 'published'");
    expect(updateCall[1][0]).toBe(10);

    // Verify INSERT post_records was called with correct params
    const insertCall = mockQuery.mock.calls[2] as [string, unknown[]];
    expect(insertCall[0]).toContain('INSERT INTO post_records');
    expect(insertCall[1][1]).toBe('fb_post_123');
    expect(insertCall[1][2]).toBe('published');
  });

  it('writes failed PostRecord and rethrows on non-transient error', async () => {
    const graphError = { message: 'Invalid OAuth token', type: 'OAuthException', code: 190 };
    const facebookErr = new MockFacebookPublishError(graphError, 400);
    mockPublishPost.mockRejectedValue(facebookErr);

    const failedRecordRow = { ...POST_RECORD_ROW, facebook_post_id: null, status: 'failed', error_message: facebookErr.message };
    const mockQuery = vi.fn()
      .mockResolvedValueOnce({ rows: [APPROVED_DRAFT_ROW] })   // loadDraftPost
      .mockResolvedValueOnce({ rows: [failedRecordRow] });       // writePostRecord on failure

    mockGetPool.mockReturnValue({ query: mockQuery } as unknown as ReturnType<typeof getPool>);

    const err = await publishDraftPost('10').catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    const typed = err as { postRecord?: { status: string } };
    expect(typed.postRecord?.status).toBe('failed');

    // Verify INSERT post_records called with 'failed' status and no facebook_post_id
    const insertCall = mockQuery.mock.calls[1] as [string, unknown[]];
    expect(insertCall[0]).toContain('INSERT INTO post_records');
    expect(insertCall[1][1]).toBeNull();
    expect(insertCall[1][2]).toBe('failed');
  });

  it('retries transient 5xx errors with exponential backoff', async () => {
    const graphError = { message: 'Internal Server Error', type: 'GraphMethodException', code: 1 };
    const transientErr = new MockFacebookPublishError(graphError, 500);

    // Fail twice, then succeed
    mockPublishPost
      .mockRejectedValueOnce(transientErr)
      .mockRejectedValueOnce(transientErr)
      .mockResolvedValueOnce('fb_post_456');

    const mockQuery = makeQueryMock(APPROVED_DRAFT_ROW, { ...POST_RECORD_ROW, facebook_post_id: 'fb_post_456' });
    mockGetPool.mockReturnValue({ query: mockQuery } as unknown as ReturnType<typeof getPool>);

    const publishPromise = publishDraftPost('10');

    // Advance timers for exponential backoff: 1000ms, then 2000ms
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);

    const record = await publishPromise;

    expect(mockPublishPost).toHaveBeenCalledTimes(3);
    expect(record.status).toBe('published');
  });

  it('stops retrying after MAX_RETRIES and writes failed PostRecord', async () => {
    const graphError = { message: 'Service Unavailable', type: 'GraphMethodException', code: 1 };
    const transientErr = new MockFacebookPublishError(graphError, 503);

    // Always fail (4 attempts: 1 initial + 3 retries)
    mockPublishPost
      .mockRejectedValueOnce(transientErr)
      .mockRejectedValueOnce(transientErr)
      .mockRejectedValueOnce(transientErr)
      .mockRejectedValueOnce(transientErr);

    const failedRecordRow = { ...POST_RECORD_ROW, facebook_post_id: null, status: 'failed', error_message: transientErr.message };
    const mockQuery = vi.fn()
      .mockResolvedValueOnce({ rows: [APPROVED_DRAFT_ROW] })
      .mockResolvedValueOnce({ rows: [failedRecordRow] });

    mockGetPool.mockReturnValue({ query: mockQuery } as unknown as ReturnType<typeof getPool>);

    // Attach .catch before advancing timers to avoid unhandled rejection warning
    const publishPromise = publishDraftPost('10').catch((e: unknown) => e);

    // Advance through all retries: 1000ms + 2000ms + 4000ms
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);
    await vi.advanceTimersByTimeAsync(4000);

    const err = await publishPromise;

    expect(mockPublishPost).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    const typed = err as { postRecord?: { status: string } };
    expect(typed.postRecord?.status).toBe('failed');
  });

  it('does not retry non-transient 4xx errors', async () => {
    const graphError = { message: 'Invalid token', type: 'OAuthException', code: 190 };
    const nonTransientErr = new MockFacebookPublishError(graphError, 400);

    mockPublishPost.mockRejectedValueOnce(nonTransientErr);

    const failedRecordRow = { ...POST_RECORD_ROW, facebook_post_id: null, status: 'failed', error_message: nonTransientErr.message };
    const mockQuery = vi.fn()
      .mockResolvedValueOnce({ rows: [APPROVED_DRAFT_ROW] })
      .mockResolvedValueOnce({ rows: [failedRecordRow] });

    mockGetPool.mockReturnValue({ query: mockQuery } as unknown as ReturnType<typeof getPool>);

    await publishDraftPost('10').catch(() => {});

    // Should only be called once — no retries for 400
    expect(mockPublishPost).toHaveBeenCalledTimes(1);
  });
});
