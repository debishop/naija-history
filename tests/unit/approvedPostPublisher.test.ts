import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/services/secrets', () => ({
  getSecrets: vi.fn().mockReturnValue({
    get: (key: string) => {
      const values: Record<string, string> = {
        FACEBOOK_PAGE_ID: 'page_123',
        FACEBOOK_PAGE_ACCESS_TOKEN: 'token_abc',
      };
      return values[key] ?? '';
    },
  }),
  SECRET_KEYS: {
    FACEBOOK_PAGE_ID: 'FACEBOOK_PAGE_ID',
    FACEBOOK_PAGE_ACCESS_TOKEN: 'FACEBOOK_PAGE_ACCESS_TOKEN',
  },
}));

vi.mock('../../src/services/facebook', () => ({
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

import { validateApprovedPost, publishApprovedPost, MIN_WORD_COUNT } from '../../src/core/approvedPostPublisher';

const DEFAULT_CREDIT = 'Photo credit: Photographer / Wikimedia Commons (CC BY-SA 4.0).';
const DEFAULT_VIDEO = 'Watch more: https://www.youtube.com/watch?v=abc123';

// Builds a caption with exactly `totalWords` words (including credit and video lines).
function makeCaption(overrides: { totalWords?: number; credit?: string; videoUrl?: string } = {}): string {
  const total = overrides.totalWords ?? MIN_WORD_COUNT + 10;
  const credit = overrides.credit ?? DEFAULT_CREDIT;
  const video = overrides.videoUrl ?? DEFAULT_VIDEO;

  const creditWordCount = credit.split(/\s+/).filter(Boolean).length;
  const videoWordCount = video.split(/\s+/).filter(Boolean).length;
  const fillerCount = Math.max(0, total - creditWordCount - videoWordCount);
  const filler = Array.from({ length: fillerCount }, (_, i) => `word${i}`).join(' ');
  return `${filler}\n\n${credit}\n${video}`;
}

const VALID_INPUT = {
  imageUrl: 'https://upload.wikimedia.org/test.jpg',
  caption: makeCaption(),
  approvedPostId: 'THEAAA-975-test',
};

describe('validateApprovedPost', () => {
  it('passes for a valid input', () => {
    expect(() => validateApprovedPost(VALID_INPUT)).not.toThrow();
  });

  it('throws if imageUrl is empty', () => {
    expect(() => validateApprovedPost({ ...VALID_INPUT, imageUrl: '' }))
      .toThrow('imageUrl is required');
  });

  it('throws if imageUrl is whitespace only', () => {
    expect(() => validateApprovedPost({ ...VALID_INPUT, imageUrl: '   ' }))
      .toThrow('imageUrl is required');
  });

  it('throws if caption is empty', () => {
    expect(() => validateApprovedPost({ ...VALID_INPUT, caption: '' }))
      .toThrow('caption is required');
  });

  it('throws if caption is below MIN_WORD_COUNT', () => {
    const shortCaption = makeCaption({ totalWords: MIN_WORD_COUNT - 1 });
    expect(() => validateApprovedPost({ ...VALID_INPUT, caption: shortCaption }))
      .toThrow(`at least ${MIN_WORD_COUNT} words`);
  });

  it('passes at exactly MIN_WORD_COUNT words', () => {
    const caption = makeCaption({ totalWords: MIN_WORD_COUNT });
    expect(() => validateApprovedPost({ ...VALID_INPUT, caption })).not.toThrow();
  });

  it('throws if CC BY-SA credit line is missing', () => {
    const noCredit = makeCaption({ credit: 'No license info here.' });
    expect(() => validateApprovedPost({ ...VALID_INPUT, caption: noCredit }))
      .toThrow('CC BY-SA credit line');
  });

  it('accepts CC BY–SA (en-dash variant)', () => {
    const caption = makeCaption({ credit: 'CC BY–SA 4.0 International' });
    expect(() => validateApprovedPost({ ...VALID_INPUT, caption })).not.toThrow();
  });

  it('accepts CC BY SA (space variant)', () => {
    const caption = makeCaption({ credit: 'CC BY SA 4.0 International' });
    expect(() => validateApprovedPost({ ...VALID_INPUT, caption })).not.toThrow();
  });

  it('throws if YouTube video link is missing', () => {
    const noVideo = makeCaption({ videoUrl: 'Watch more: https://vimeo.com/abc' });
    expect(() => validateApprovedPost({ ...VALID_INPUT, caption: noVideo }))
      .toThrow('YouTube video link');
  });

  it('accepts youtu.be short links', () => {
    const caption = makeCaption({ videoUrl: 'Watch more: https://youtu.be/abc123' });
    expect(() => validateApprovedPost({ ...VALID_INPUT, caption })).not.toThrow();
  });
});

describe('publishApprovedPost', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function mockTokenResolution(postId = 'page_123_789456123') {
    // First fetch: token resolution (returns same token)
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { message: 'already a page token', type: 'OAuthException', code: 190 } }),
    });
    // Second fetch: photo publish
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: '987', post_id: postId }),
    });
  }

  it('returns postId and permalink on success', async () => {
    mockTokenResolution('page_123_789456123');

    const result = await publishApprovedPost(VALID_INPUT);

    expect(result.postId).toBe('page_123_789456123');
    expect(result.permalink).toBe('https://www.facebook.com/page_123_789456123');
  });

  it('POSTs to the /photos endpoint with published=true', async () => {
    mockTokenResolution();

    await publishApprovedPost(VALID_INPUT);

    const [photoUrl, photoInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(photoUrl).toContain('/page_123/photos');
    const bodyStr = photoInit.body as string;
    expect(bodyStr).toContain('published=true');
    expect(bodyStr).toContain(encodeURIComponent(VALID_INPUT.imageUrl));
  });

  it('uses post_id over id when both are returned', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ error: { message: 'x', type: 'y', code: 1 } }) });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: 'photo_id_only', post_id: 'real_post_id' }),
    });

    const result = await publishApprovedPost(VALID_INPUT);
    expect(result.postId).toBe('real_post_id');
  });

  it('falls back to id when post_id is absent', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ error: { message: 'x', type: 'y', code: 1 } }) });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: 'photo_id_only' }),
    });

    const result = await publishApprovedPost(VALID_INPUT);
    expect(result.postId).toBe('photo_id_only');
  });

  it('throws descriptive error on FB error 506 (duplicate content)', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ error: { message: 'x', type: 'y', code: 1 } }) });
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: { message: 'This content has already been published.', type: 'OAuthException', code: 506 } }),
    });

    await expect(publishApprovedPost(VALID_INPUT)).rejects.toThrow('already published');
  });

  it('throws FacebookPublishError on other FB API errors', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ error: { message: 'x', type: 'y', code: 1 } }) });
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: { message: 'Invalid OAuth token', type: 'OAuthException', code: 190 } }),
    });

    await expect(publishApprovedPost(VALID_INPUT)).rejects.toThrow('Facebook Graph API error');
  });

  it('throws if validation fails before hitting FB', async () => {
    const badInput = { ...VALID_INPUT, imageUrl: '' };
    await expect(publishApprovedPost(badInput)).rejects.toThrow('imageUrl is required');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
