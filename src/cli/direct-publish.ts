import * as dotenv from 'dotenv';
dotenv.config();

import Anthropic from '@anthropic-ai/sdk';
import { initSecrets, getSecrets, SECRET_KEYS } from '../services/secrets';
import { deletePost, publishPost } from '../services/facebook';
import { notifySlack } from '../services/notifications';
import { getPool, closePool } from '../db/pool';

/**
 * Generates and publishes a themed post directly from Claude's knowledge,
 * bypassing article fetching. Used when article sources have empty content.
 *
 * ENV:
 *   THEME        – theme name (e.g. "Independence & Nation-Building")
 *   DELETE_POST  – optional Facebook post ID to delete before publishing
 */

const WEEKLY_THEMES: Record<string, string> = {
  monday: 'Precolonial Heritage',
  tuesday: 'Colonial Era & Resistance',
  wednesday: 'Independence & Nation-Building',
  thursday: 'Modern Nigeria',
  friday: 'Cultural Spotlight',
};

function getTodayTheme(): string {
  const day = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  return WEEKLY_THEMES[day] ?? 'Nigerian History';
}

const DIRECT_GENERATION_PROMPT = (theme: string): string => `
You are writing a Facebook post for "The Lens", a page dedicated to Nigerian history and culture.

Today's theme is: **${theme}**

Write an engaging, educational Facebook post that teaches readers about this theme in Nigerian history. The post MUST:
- Be based only on well-established, verifiable historical facts
- Be written in an engaging, accessible tone suitable for a general audience
- Cover a specific event, figure, or development related to the theme
- Be substantial — include 3–5 informative paragraphs with real names, dates, and context

The post MUST follow this exact format:

[Hook — one punchy sentence that grabs attention]

[Narrative body — 3–5 paragraphs, factual, engaging, educational]

[Call to action — invite readers to share, comment, or reflect on this history]

#NigerianHistory #Africa [3–5 relevant topic hashtags, no # on the final list]

IMPORTANT:
- Include only verified historical facts
- Generate 3–5 relevant hashtags (in addition to #NigerianHistory and #Africa) based on the theme
- Return only the post text, nothing else
`.trim();

async function generateDirectPost(theme: string): Promise<string> {
  const apiKey = getSecrets().get(SECRET_KEYS.ANTHROPIC_API_KEY);
  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [{ role: 'user', content: DIRECT_GENERATION_PROMPT(theme) }],
  });

  const textBlock = message.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude returned no text content.');
  }
  return textBlock.text.trim();
}

async function saveDraftPost(body: string, theme: string): Promise<string> {
  const pool = getPool();
  interface CandidateRow { id: number }
  interface DraftRow { id: number }

  // Create a synthetic story_candidate to satisfy the FK constraint
  const candidateResult = await pool.query<CandidateRow>(
    `INSERT INTO story_candidates
       (source_url, source_domain, source_name, title, summary, raw_content, content_hash, published_at, fetched_at)
     VALUES ($1, $2, $3, $4, $5, $6, md5($6), NULL, NOW())
     RETURNING id`,
    [
      `direct://${theme.toLowerCase().replace(/\s+/g, '-')}`,
      'direct',
      `Direct — ${theme}`,
      `Direct post: ${theme}`,
      body.slice(0, 500),
      body,
    ]
  );
  const storyId = candidateResult.rows[0].id;

  const draftResult = await pool.query<DraftRow>(
    `INSERT INTO draft_posts
       (story_candidate_id, body, source_citation, source_url, source_name, hashtags, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'approved')
     RETURNING id`,
    [storyId, body, `Direct generation — ${theme}`, '', `Direct — ${theme}`, body.match(/#\w+/g) ?? []]
  );
  return String(draftResult.rows[0].id);
}

async function markDraftPublished(draftId: string): Promise<void> {
  const pool = getPool();
  await pool.query(
    `UPDATE draft_posts SET status = 'published', updated_at = NOW() WHERE id = $1`,
    [Number(draftId)]
  );
}

async function writePostRecord(draftId: string, facebookPostId: string): Promise<void> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO post_records (draft_post_id, facebook_post_id, status)
     VALUES ($1, $2, 'published')`,
    [Number(draftId), facebookPostId]
  );
}

async function main(): Promise<void> {
  initSecrets();

  const theme = process.env['THEME'] ?? getTodayTheme();
  const deletePostId = process.env['DELETE_POST'];

  console.log(`Theme: ${theme}`);

  if (deletePostId) {
    console.log(`Deleting bad post: ${deletePostId}`);
    await deletePost(deletePostId);
    console.log('Deleted.');
  }

  console.log('Generating post from Claude knowledge...');
  const body = await generateDirectPost(theme);
  console.log('\n--- Post Body ---');
  console.log(body.slice(0, 300) + (body.length > 300 ? '...' : ''));
  console.log('--- End ---\n');

  const draftId = await saveDraftPost(body, theme);
  console.log(`Draft saved as ID ${draftId}`);

  // Build a minimal DraftPost for publishPost()
  const draft = {
    id: draftId,
    storyCandidateId: '0',
    body,
    hashtags: (body.match(/#\w+/g) ?? []).map((h) => h.slice(1)),
    sourceUrl: '',
    sourceName: `Direct — ${theme}`,
    generatedAt: new Date(),
    status: 'approved' as const,
  };

  const facebookPostId = await publishPost(draft);
  await markDraftPublished(draftId);
  await writePostRecord(draftId, facebookPostId);

  const facebookPostUrl = `https://www.facebook.com/${facebookPostId}`;
  console.log(`Published: ${facebookPostUrl}`);

  await notifySlack({
    event: 'published',
    facebookPostUrl,
    excerpt: body.slice(0, 200),
  });
}

main()
  .catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${message}`);
    process.exit(1);
  })
  .finally(() => closePool());
