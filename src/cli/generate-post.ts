import * as dotenv from 'dotenv';
import { initSecrets } from '../services/secrets';
import { getPool, closePool } from '../db/pool';
import { generatePost } from '../core/contentGeneration';
import type { StoryCandidate } from '../core/research';

dotenv.config();

function parseArgs(): { storyCandidateId: string } {
  const args = process.argv.slice(2);
  const idIndex = args.indexOf('--id');
  if (idIndex === -1 || !args[idIndex + 1]) {
    console.error('Usage: generate-post --id <storyCandidateId>');
    process.exit(1);
  }
  return { storyCandidateId: args[idIndex + 1] };
}

interface DbRow {
  id: number;
  title: string;
  summary: string | null;
  source_url: string;
  source_name: string;
  published_at: Date | null;
  raw_content: string | null;
  fetched_at: Date;
}

async function loadCandidate(id: string): Promise<StoryCandidate> {
  const pool = getPool();
  const result = await pool.query<DbRow>(
    'SELECT id, title, summary, source_url, source_name, published_at, raw_content, fetched_at FROM story_candidates WHERE id = $1',
    [Number(id)]
  );
  if (result.rows.length === 0) {
    throw new Error(`Story candidate with id ${id} not found.`);
  }
  const row = result.rows[0];
  return {
    id: String(row.id),
    title: row.title,
    summary: row.summary ?? '',
    sourceUrl: row.source_url,
    sourceName: row.source_name,
    publishedAt: row.published_at,
    rawText: row.raw_content ?? '',
    fetchedAt: row.fetched_at,
  };
}

async function main(): Promise<void> {
  initSecrets();

  const { storyCandidateId } = parseArgs();
  console.log(`Generating post for story candidate: ${storyCandidateId}`);

  const candidate = await loadCandidate(storyCandidateId);
  const draft = await generatePost(candidate);

  console.log('\n--- Draft Post ---');
  console.log(`ID:          ${draft.id}`);
  console.log(`Candidate:   ${draft.storyCandidateId}`);
  console.log(`Status:      ${draft.status}`);
  console.log(`Generated:   ${draft.generatedAt.toISOString()}`);
  console.log(`Source:      ${draft.sourceName} — ${draft.sourceUrl}`);
  console.log(`Hashtags:    ${draft.hashtags.map((h) => `#${h}`).join(' ')}`);
  console.log('\n--- Post Body ---');
  console.log(draft.body);
  console.log('--- End ---\n');
}

main()
  .catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${message}`);
    process.exit(1);
  })
  .finally(() => closePool());
