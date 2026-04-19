import * as dotenv from 'dotenv';
import { initSecrets } from '../services/secrets';
import { fetchStory } from '../core/research';
import { closePool } from '../db/pool';

dotenv.config();

function parseArgs(): { url: string } {
  const args = process.argv.slice(2);
  const urlIndex = args.indexOf('--url');
  if (urlIndex === -1 || !args[urlIndex + 1]) {
    console.error('Usage: fetch-story --url <url>');
    process.exit(1);
  }
  return { url: args[urlIndex + 1] };
}

async function main(): Promise<void> {
  initSecrets();

  const { url } = parseArgs();
  console.log(`Fetching story from: ${url}`);

  const story = await fetchStory(url);

  console.log('\n--- Story Candidate ---');
  console.log(`ID:          ${story.id}`);
  console.log(`Title:       ${story.title}`);
  console.log(`Source:      ${story.sourceName}`);
  console.log(`URL:         ${story.sourceUrl}`);
  console.log(`Fetched At:  ${story.fetchedAt.toISOString()}`);
  if (story.publishedAt) {
    console.log(`Published:   ${story.publishedAt.toISOString()}`);
  }
  console.log(`Summary:     ${story.summary}`);
  console.log('--- End ---\n');
}

main()
  .catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${message}`);
    process.exit(1);
  })
  .finally(() => closePool());
