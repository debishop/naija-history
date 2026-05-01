import Anthropic from '@anthropic-ai/sdk';
import { isWhitelisted } from '../lib/whitelist';
import { getPool } from '../db/pool';
import { getSecrets, SECRET_KEYS } from '../services/secrets';
import type { StoryCandidate } from './research';

export interface DraftPost {
  id: string;
  storyCandidateId: string;
  body: string;
  hashtags: string[];
  sourceUrl: string;
  sourceName: string;
  generatedAt: Date;
  status: 'draft' | 'approved' | 'rejected' | 'pending_approval' | 'published';
}

interface DbDraftRow {
  id: number;
  story_candidate_id: number;
  body: string;
  hashtags: string[];
  source_url: string;
  source_name: string;
  status: string;
  created_at: Date;
}

function rowToDraftPost(row: DbDraftRow): DraftPost {
  return {
    id: String(row.id),
    storyCandidateId: String(row.story_candidate_id),
    body: row.body,
    hashtags: row.hashtags,
    sourceUrl: row.source_url,
    sourceName: row.source_name,
    generatedAt: row.created_at,
    status: row.status as DraftPost['status'],
  };
}

const GENERATION_PROMPT = (candidate: StoryCandidate): string => `
You are writing a Facebook post for "The Lens", a page dedicated to Nigerian history and culture.

Write a compelling Facebook post based ONLY on the facts provided below. Do not add any claims not present in the source text.

Story details:
- Title: ${candidate.title}
- Source: ${candidate.sourceName} (${candidate.sourceUrl})
- Content: ${candidate.rawText.slice(0, 3000)}

The post MUST follow this exact format:

[Hook - one punchy sentence that grabs attention]

[Narrative body - at least 5 paragraphs, factual, engaging, based only on the source text. MINIMUM 600 words total]

[Engagement question - end with a direct question to the reader e.g. 'What aspect of this history resonates most with you? Share below!']

[YouTube video link - find and include a relevant YouTube documentary URL: 'Watch more: https://www.youtube.com/watch?v=...']

📚 Source: ${candidate.sourceName} — ${candidate.sourceUrl}
#NigerianHistory #Africa [Add 13+ more relevant hashtags here - minimum 15 hashtags total]

IMPORTANT:
- Include only verified historical facts with specific dates
- NEVER use dash characters: no em dashes, en dashes, or hyphens used as dashes anywhere
- The post body MUST be at least 600 words - expand paragraphs if needed
- The post MUST end with a question to drive reader engagement
- MUST include a real YouTube documentary/educational video URL about the topic
- MUST include at least 15 hashtags total including NigerianHistory and Africa
- Include the source citation line exactly as shown above
- Return only the post text, nothing else
`.trim();

function extractHashtags(body: string): string[] {
  const matches = body.match(/#\w+/g);
  if (!matches) return [];
  return [...new Set(matches.map((h) => h.slice(1)))];
}

export async function generatePost(candidate: StoryCandidate): Promise<DraftPost> {
  if (!candidate.sourceUrl) {
    throw new Error('Cannot generate post: sourceUrl is missing on the story candidate.');
  }

  if (!isWhitelisted(candidate.sourceUrl)) {
    throw new Error(
      `Cannot generate post: sourceUrl "${candidate.sourceUrl}" is not on the approved whitelist.`
    );
  }

  const apiKey = getSecrets().get(SECRET_KEYS.ANTHROPIC_API_KEY);
  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2500,
    messages: [
      {
        role: 'user',
        content: GENERATION_PROMPT(candidate),
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude returned no text content in its response.');
  }

  const body = textBlock.text.trim();
  const hashtags = extractHashtags(body);
  const sourceCitation = `${candidate.sourceName} — ${candidate.sourceUrl}`;

  const pool = getPool();
  const result = await pool.query<DbDraftRow>(
    `INSERT INTO draft_posts
       (story_candidate_id, body, source_citation, source_url, source_name, hashtags, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'draft')
     RETURNING id, story_candidate_id, body, hashtags, source_url, source_name, status, created_at`,
    [
      Number(candidate.id),
      body,
      sourceCitation,
      candidate.sourceUrl,
      candidate.sourceName,
      hashtags,
    ]
  );

  return rowToDraftPost(result.rows[0]);
}
