import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock external dependencies before importing the module under test
vi.mock('@anthropic-ai/sdk', () => {
  const create = vi.fn();
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: { create },
    })),
    __mockCreate: create,
  };
});

vi.mock('../../src/db/pool', () => ({
  getPool: vi.fn().mockReturnValue({
    query: vi.fn(),
  }),
}));

vi.mock('../../src/services/secrets', () => ({
  getSecrets: vi.fn().mockReturnValue({
    get: vi.fn().mockReturnValue('test-anthropic-key'),
  }),
  SECRET_KEYS: {
    ANTHROPIC_API_KEY: 'ANTHROPIC_API_KEY',
  },
}));

vi.mock('../../src/lib/whitelist', () => ({
  isWhitelisted: vi.fn(),
}));

import { generatePost } from '../../src/core/contentGeneration';
import { isWhitelisted } from '../../src/lib/whitelist';
import { getPool } from '../../src/db/pool';
import Anthropic from '@anthropic-ai/sdk';
import type { StoryCandidate } from '../../src/core/research';

const mockIsWhitelisted = vi.mocked(isWhitelisted);
const mockGetPool = vi.mocked(getPool);
const MockAnthropic = vi.mocked(Anthropic);

function makeMockCreate(responseText: string) {
  return vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: responseText }],
  });
}

const BASE_CANDIDATE: StoryCandidate = {
  id: '42',
  title: 'The Story of the Benin Bronzes',
  summary: 'A summary of the Benin Bronzes.',
  sourceUrl: 'https://bbc.com/news/world-africa-benin-bronzes',
  sourceName: 'BBC',
  publishedAt: new Date('2023-01-01'),
  rawText: 'The Benin Bronzes are a collection of more than a thousand metal plaques...',
  fetchedAt: new Date(),
};

const MOCK_POST_BODY = `Did you know the Benin Bronzes tell a story that spans centuries?

The bronzes were created by skilled craftsmen in the Kingdom of Benin...

Learn more and share this history with others!

📚 Source: BBC — https://bbc.com/news/world-africa-benin-bronzes
#NigerianHistory #Africa #BeninBronzes #WestAfrica #Heritage`;

describe('generatePost', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws if sourceUrl is empty', async () => {
    const candidate = { ...BASE_CANDIDATE, sourceUrl: '' };
    await expect(generatePost(candidate)).rejects.toThrow('sourceUrl is missing');
  });

  it('throws if sourceUrl is not whitelisted', async () => {
    mockIsWhitelisted.mockReturnValue(false);
    await expect(generatePost(BASE_CANDIDATE)).rejects.toThrow('not on the approved whitelist');
    expect(mockIsWhitelisted).toHaveBeenCalledWith(BASE_CANDIDATE.sourceUrl);
  });

  it('calls Claude API and persists DraftPost when source is whitelisted', async () => {
    mockIsWhitelisted.mockReturnValue(true);

    const mockCreate = makeMockCreate(MOCK_POST_BODY);
    MockAnthropic.mockImplementation(function () {
      return { messages: { create: mockCreate } };
    } as unknown as typeof Anthropic);

    const mockQuery = vi.fn().mockResolvedValue({
      rows: [
        {
          id: 1,
          story_candidate_id: 42,
          body: MOCK_POST_BODY,
          hashtags: ['NigerianHistory', 'Africa', 'BeninBronzes', 'WestAfrica', 'Heritage'],
          source_url: BASE_CANDIDATE.sourceUrl,
          source_name: BASE_CANDIDATE.sourceName,
          status: 'draft',
          created_at: new Date('2024-01-01'),
        },
      ],
    });
    mockGetPool.mockReturnValue({ query: mockQuery } as unknown as ReturnType<typeof getPool>);

    const draft = await generatePost(BASE_CANDIDATE);

    expect(mockCreate).toHaveBeenCalledOnce();
    const callArgs = mockCreate.mock.calls[0][0] as { model: string; messages: { role: string; content: string }[] };
    expect(callArgs.model).toBe('claude-sonnet-4-6');
    expect(callArgs.messages[0].content).toContain(BASE_CANDIDATE.sourceUrl);
    expect(callArgs.messages[0].content).toContain(BASE_CANDIDATE.rawText.slice(0, 100));

    expect(mockQuery).toHaveBeenCalledOnce();
    const [sql, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('INSERT INTO draft_posts');
    expect(params[0]).toBe(42);  // story_candidate_id as number
    expect(params[3]).toBe(BASE_CANDIDATE.sourceUrl);
    expect(params[4]).toBe(BASE_CANDIDATE.sourceName);

    expect(draft.id).toBe('1');
    expect(draft.storyCandidateId).toBe('42');
    expect(draft.status).toBe('draft');
    expect(draft.sourceUrl).toBe(BASE_CANDIDATE.sourceUrl);
    expect(draft.sourceName).toBe(BASE_CANDIDATE.sourceName);
  });

  it('extracts hashtags from post body', async () => {
    mockIsWhitelisted.mockReturnValue(true);

    const mockCreate = makeMockCreate(MOCK_POST_BODY);
    MockAnthropic.mockImplementation(function () {
      return { messages: { create: mockCreate } };
    } as unknown as typeof Anthropic);

    const expectedHashtags = ['NigerianHistory', 'Africa', 'BeninBronzes', 'WestAfrica', 'Heritage'];
    const mockQuery = vi.fn().mockResolvedValue({
      rows: [
        {
          id: 2,
          story_candidate_id: 42,
          body: MOCK_POST_BODY,
          hashtags: expectedHashtags,
          source_url: BASE_CANDIDATE.sourceUrl,
          source_name: BASE_CANDIDATE.sourceName,
          status: 'draft',
          created_at: new Date(),
        },
      ],
    });
    mockGetPool.mockReturnValue({ query: mockQuery } as unknown as ReturnType<typeof getPool>);

    await generatePost(BASE_CANDIDATE);

    const params = mockQuery.mock.calls[0][1] as unknown[];
    const insertedHashtags = params[5] as string[];
    expect(insertedHashtags).toContain('NigerianHistory');
    expect(insertedHashtags).toContain('Africa');
    expect(insertedHashtags).toContain('BeninBronzes');
  });

  it('throws if Claude returns no text content', async () => {
    mockIsWhitelisted.mockReturnValue(true);

    const mockCreate = vi.fn().mockResolvedValue({ content: [] });
    MockAnthropic.mockImplementation(function () {
      return { messages: { create: mockCreate } };
    } as unknown as typeof Anthropic);

    await expect(generatePost(BASE_CANDIDATE)).rejects.toThrow('no text content');
  });
});
