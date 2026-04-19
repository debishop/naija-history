import 'dotenv/config';
import { initSecrets } from '../services/secrets';
import { snapshotEngagement } from '../core/analytics';
import { closePool } from '../db/pool';

async function main(): Promise<void> {
  const postRecordId = process.argv[2];
  if (!postRecordId) {
    console.error('Usage: ts-node src/cli/snapshot-engagement.ts <postRecordId>');
    process.exit(1);
  }

  initSecrets();

  try {
    console.log(`Fetching engagement snapshot for PostRecord ${postRecordId}...`);
    const record = await snapshotEngagement(postRecordId);
    console.log('Engagement snapshot recorded:');
    console.log(JSON.stringify(record, null, 2));
  } finally {
    await closePool();
  }
}

main().catch((err: unknown) => {
  console.error('Error:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
