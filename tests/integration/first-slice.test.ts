/**
 * Integration test: full first-slice pipeline
 *
 * Validates the end-to-end flow:
 *   fetchStory → generatePost → publishDraftPost → snapshotEngagement
 *
 * What is mocked:
 *   - HTTP fetcher (no real network calls to news sources)
 *   - Anthropic Claude API (no real LLM calls)
 *   - Facebook Graph API publish + engagement (no live publishing)
 *   - PostgreSQL pool (in-memory mock; no real DB required)
 *   - Secrets client (canned values)
 *
 * What is validated:
 *   - Draft post has source citation in body
 *   - Draft post body contains the #NigerianHistory hashtag
 *   - Draft post body contains the whitelisted source URL
 *   - All DB write paths are invoked with correct arguments
 *   - PostRecord is created with the mocked Facebook post ID
 *   - EngagementRecord is created with the mocked engagement metrics
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const WHITELISTED_URL = 'https://reuters.com/article/nigeria-history-benin-kingdom';
const SOURCE_NAME = 'Reuters';

const CANNED_ARTICLE = {
  title: 'The Benin Kingdom: A Legacy of Art and Governance in West Africa',
  summary:
    'The Benin Kingdom, established around 900 CE, became one of the most sophisticated states in pre-colonial West Africa.',
  rawText:
    'The Benin Kingdom, established around 900 CE in what is now southern Nigeria, became one of the most ' +
    'sophisticated states in pre-colonial West Africa. Renowned for its bronzes, ivories, and highly organised ' +
    'court administration, Benin City served as the capital of an empire that traded extensively with European ' +
    'merchants from the 15th century onward. The kingdom\'s unique art tradition — characterised by detailed ' +
    'brass plaques depicting royal ceremonies — remains globally recognised today.',
  publishedAt: new Date('2024-03-15T10:00:00Z'),
};

const CANNED_DRAFT_BODY = `Did you know the Benin Kingdom was one of West Africa\'s most advanced civilisations?

The Benin Kingdom, founded around 900 CE in present-day southern Nigeria, developed one of the most sophisticated court systems on the continent. Its famous bronze plaques and ivory carvings are now housed in museums worldwide.

From the 15th century, Benin traded extensively with European merchants — centuries before colonisation. The artisans of Benin City produced works so detailed that early European visitors refused to believe Africans had made them.

Learn more about this remarkable civilisation and share this post to keep Nigeria\'s history alive.

📚 Source: Reuters — ${WHITELISTED_URL}
#NigerianHistory #Africa #BeninKingdom #WestAfrica #PrecolonialAfrica`;

const FACEBOOK_POST_ID = '61577657207009_123456789';

const CANNED_ENGAGEMENT = {
  reactions: 142,
  comments: 38,
  shares: 67,
  reach: 4820,
};

// DB row IDs used throughout
const STORY_ID = 1;
const DRAFT_ID = 2;
const POST_RECORD_ID = 3;
const ENGAGEMENT_ID = 4;

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

function makeMockPool() {
  /**
   * Tracks calls so we can assert on them.
   * The query order for the full pipeline is:
   *   1. SELECT content_hash (dedup check in fetchStory)         → no rows
   *   2. INSERT story_candidates                                  → storyRow
   *   3. INSERT draft_posts                                       → draftRow
   *   4. SELECT draft_posts WHERE id = DRAFT_ID (loadDraftPost)  → approvedDraftRow
   *   5. UPDATE draft_posts SET status = 'published'             → rowCount 1
   *   6. INSERT post_records                                      → postRecordRow
   *   7. SELECT post_records WHERE id = POST_RECORD_ID            → postRecordRow
   *   8. INSERT engagement_records                                → engagementRow
   */
  const storyRow = {
    id: STORY_ID,
    title: CANNED_ARTICLE.title,
    summary: CANNED_ARTICLE.summary,
    source_url: WHITELISTED_URL,
    source_name: SOURCE_NAME,
    published_at: CANNED_ARTICLE.publishedAt,
    raw_content: CANNED_ARTICLE.rawText,
    fetched_at: new Date(),
  };

  const draftRow = {
    id: DRAFT_ID,
    story_candidate_id: STORY_ID,
    body: CANNED_DRAFT_BODY,
    hashtags: ['NigerianHistory', 'Africa', 'BeninKingdom', 'WestAfrica', 'PrecolonialAfrica'],
    source_url: WHITELISTED_URL,
    source_name: SOURCE_NAME,
    status: 'draft',
    created_at: new Date(),
  };

  // Same row but status = 'approved' for loadDraftPost
  const approvedDraftRow = { ...draftRow, status: 'approved' };

  const postRecordRow = {
    id: POST_RECORD_ID,
    draft_post_id: DRAFT_ID,
    facebook_post_id: FACEBOOK_POST_ID,
    published_at: new Date(),
    status: 'published',
    error_message: null,
  };

  const engagementRow = {
    id: ENGAGEMENT_ID,
    post_record_id: POST_RECORD_ID,
    facebook_post_id: FACEBOOK_POST_ID,
    likes: CANNED_ENGAGEMENT.reactions,
    comments: CANNED_ENGAGEMENT.comments,
    shares: CANNED_ENGAGEMENT.shares,
    reach: CANNED_ENGAGEMENT.reach,
    snapshot_at: new Date(),
  };

  const query = vi
    .fn()
    // 1. dedup SELECT
    .mockResolvedValueOnce({ rows: [] })
    // 2. INSERT story_candidates
    .mockResolvedValueOnce({ rows: [storyRow] })
    // 3. INSERT draft_posts
    .mockResolvedValueOnce({ rows: [draftRow] })
    // 4. SELECT draft_posts (loadDraftPost — uses approved status)
    .mockResolvedValueOnce({ rows: [approvedDraftRow] })
    // 5. UPDATE draft_posts SET status='published'
    .mockResolvedValueOnce({ rowCount: 1 })
    // 6. INSERT post_records
    .mockResolvedValueOnce({ rows: [postRecordRow] })
    // 7. SELECT post_records WHERE id = POST_RECORD_ID
    .mockResolvedValueOnce({ rows: [postRecordRow] })
    // 8. INSERT engagement_records
    .mockResolvedValueOnce({ rows: [engagementRow] });

  return { query, rows: { storyRow, draftRow, postRecordRow, engagementRow } };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('First-slice pipeline — end-to-end integration', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('runs the full pipeline and produces valid records for each stage', async () => {
    // -----------------------------------------------------------------------
    // 1. Wire up all mocks before any dynamic imports
    // -----------------------------------------------------------------------
    const mockPool = makeMockPool();

    // Secrets
    vi.doMock('../../src/services/secrets', () => ({
      initSecrets: vi.fn(),
      getSecrets: () => ({
        get: (key: string) => {
          const map: Record<string, string> = {
            DATABASE_URL: 'postgresql://test:test@localhost/test',
            ANTHROPIC_API_KEY: 'sk-ant-test',
            FACEBOOK_PAGE_ACCESS_TOKEN: 'fake-page-token',
            FACEBOOK_APP_SECRET: 'fake-app-secret',
          };
          if (!map[key]) throw new Error(`Secret not found: ${key}`);
          return map[key];
        },
      }),
      SECRET_KEYS: {
        DATABASE_URL: 'DATABASE_URL',
        ANTHROPIC_API_KEY: 'ANTHROPIC_API_KEY',
        FACEBOOK_PAGE_ACCESS_TOKEN: 'FACEBOOK_PAGE_ACCESS_TOKEN',
        FACEBOOK_APP_SECRET: 'FACEBOOK_APP_SECRET',
      },
    }));

    // DB pool
    vi.doMock('../../src/db/pool', () => ({
      getPool: () => mockPool,
    }));

    // Fetcher — returns canned article
    vi.doMock('../../src/services/fetcher', () => ({
      fetchArticle: vi.fn().mockResolvedValue(CANNED_ARTICLE),
    }));

    // Anthropic SDK — returns canned post body
    vi.doMock('@anthropic-ai/sdk', () => {
      const createMock = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: CANNED_DRAFT_BODY }],
      });
      class AnthropicMock {
        messages = { create: createMock };
        constructor(_opts: unknown) {}
      }
      return { default: AnthropicMock };
    });

    // Facebook Graph API — mock publish and engagement
    vi.doMock('../../src/services/facebook', () => ({
      publishPost: vi.fn().mockResolvedValue(FACEBOOK_POST_ID),
      getPostEngagement: vi.fn().mockResolvedValue(CANNED_ENGAGEMENT),
      FacebookPublishError: class FacebookPublishError extends Error {
        httpStatus: number;
        graphError: { code: number; message: string; type: string };
        constructor(graphError: { code: number; message: string; type: string }, httpStatus: number) {
          super(graphError.message);
          this.httpStatus = httpStatus;
          this.graphError = graphError;
        }
      },
    }));

    // -----------------------------------------------------------------------
    // 2. Import modules after mocks are in place
    // -----------------------------------------------------------------------
    const { fetchStory } = await import('../../src/core/research');
    const { generatePost } = await import('../../src/core/contentGeneration');
    const { publishDraftPost } = await import('../../src/core/publisher');
    const { snapshotEngagement } = await import('../../src/core/analytics');

    // -----------------------------------------------------------------------
    // 3. Stage 1: fetch story
    // -----------------------------------------------------------------------
    const story = await fetchStory(WHITELISTED_URL);

    expect(story.id).toBe(String(STORY_ID));
    expect(story.sourceName).toBe(SOURCE_NAME);
    expect(story.sourceUrl).toBe(WHITELISTED_URL);
    expect(story.title).toBe(CANNED_ARTICLE.title);

    // -----------------------------------------------------------------------
    // 4. Stage 2: generate post (draft — no publish)
    // -----------------------------------------------------------------------
    const draft = await generatePost(story);

    // Draft output correctness
    expect(draft.id).toBe(String(DRAFT_ID));
    expect(draft.status).toBe('draft');

    // Source citation present in body
    expect(draft.body).toContain(`📚 Source: ${SOURCE_NAME}`);
    expect(draft.body).toContain(WHITELISTED_URL);

    // Required hashtags present
    expect(draft.body).toContain('#NigerianHistory');
    expect(draft.body).toContain('#Africa');

    // Post format: must have at least a hook line and some body
    const lines = draft.body.split('\n').filter((l) => l.trim().length > 0);
    expect(lines.length).toBeGreaterThanOrEqual(4);

    // Hashtags array populated
    expect(draft.hashtags).toContain('NigerianHistory');
    expect(draft.hashtags.length).toBeGreaterThanOrEqual(2);

    // -----------------------------------------------------------------------
    // 5. Stage 3: publish (mocked Facebook call)
    // -----------------------------------------------------------------------
    const postRecord = await publishDraftPost(String(DRAFT_ID));

    expect(postRecord.id).toBe(String(POST_RECORD_ID));
    expect(postRecord.facebookPostId).toBe(FACEBOOK_POST_ID);
    expect(postRecord.status).toBe('published');
    expect(postRecord.draftPostId).toBe(String(DRAFT_ID));

    // -----------------------------------------------------------------------
    // 6. Stage 4: engagement snapshot (mocked poll)
    // -----------------------------------------------------------------------
    const engagement = await snapshotEngagement(String(POST_RECORD_ID));

    expect(engagement.id).toBe(String(ENGAGEMENT_ID));
    expect(engagement.postRecordId).toBe(String(POST_RECORD_ID));
    expect(engagement.facebookPostId).toBe(FACEBOOK_POST_ID);
    expect(engagement.reactions).toBe(CANNED_ENGAGEMENT.reactions);
    expect(engagement.comments).toBe(CANNED_ENGAGEMENT.comments);
    expect(engagement.shares).toBe(CANNED_ENGAGEMENT.shares);
    expect(engagement.reach).toBe(CANNED_ENGAGEMENT.reach);

    // -----------------------------------------------------------------------
    // 7. Verify DB write calls
    // -----------------------------------------------------------------------
    // Total: 8 queries (dedup select, insert story, insert draft, select draft,
    //         update draft status, insert post_record, select post_record, insert engagement)
    expect(mockPool.query).toHaveBeenCalledTimes(8);

    // INSERT story_candidates call (2nd query) includes the whitelisted URL
    expect(mockPool.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('INSERT INTO story_candidates'),
      expect.arrayContaining([WHITELISTED_URL])
    );

    // INSERT draft_posts call (3rd query) uses the story ID
    expect(mockPool.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('INSERT INTO draft_posts'),
      expect.arrayContaining([STORY_ID])
    );

    // INSERT post_records call (6th query) includes the Facebook post ID
    expect(mockPool.query).toHaveBeenNthCalledWith(
      6,
      expect.stringContaining('INSERT INTO post_records'),
      expect.arrayContaining([FACEBOOK_POST_ID])
    );

    // INSERT engagement_records call (8th query) includes the engagement metrics
    expect(mockPool.query).toHaveBeenNthCalledWith(
      8,
      expect.stringContaining('INSERT INTO engagement_records'),
      expect.arrayContaining([
        POST_RECORD_ID,
        FACEBOOK_POST_ID,
        CANNED_ENGAGEMENT.reactions,
        CANNED_ENGAGEMENT.comments,
        CANNED_ENGAGEMENT.shares,
        CANNED_ENGAGEMENT.reach,
      ])
    );
  });

  it('rejects a non-whitelisted source URL before any fetch or generation', async () => {
    vi.doMock('../../src/services/fetcher', () => ({
      fetchArticle: vi.fn(),
    }));
    vi.doMock('../../src/db/pool', () => ({
      getPool: () => ({ query: vi.fn() }),
    }));

    const { fetchStory } = await import('../../src/core/research');

    await expect(fetchStory('https://spam-site.example.com/article')).rejects.toThrow(
      'Domain not whitelisted'
    );
  });

  it('prevents publishing a draft that is not in approved status', async () => {
    const mockPool = {
      query: vi.fn().mockResolvedValue({
        rows: [
          {
            id: DRAFT_ID,
            story_candidate_id: STORY_ID,
            body: CANNED_DRAFT_BODY,
            hashtags: ['NigerianHistory'],
            source_url: WHITELISTED_URL,
            source_name: SOURCE_NAME,
            status: 'draft', // not approved
            created_at: new Date(),
          },
        ],
      }),
    };

    vi.doMock('../../src/db/pool', () => ({
      getPool: () => mockPool,
    }));
    vi.doMock('../../src/services/facebook', () => ({
      publishPost: vi.fn(),
      FacebookPublishError: class extends Error {},
    }));
    vi.doMock('../../src/services/secrets', () => ({
      getSecrets: () => ({ get: () => 'fake-token' }),
      SECRET_KEYS: { FACEBOOK_PAGE_ACCESS_TOKEN: 'FACEBOOK_PAGE_ACCESS_TOKEN' },
    }));

    const { publishDraftPost } = await import('../../src/core/publisher');

    await expect(publishDraftPost(String(DRAFT_ID))).rejects.toThrow(
      'only approved posts may be published'
    );
  });
});
