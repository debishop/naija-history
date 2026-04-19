import * as dotenv from 'dotenv';
import { initSecrets } from '../services/secrets';
import { closePool } from '../db/pool';
import { publishDraftPost } from '../core/publisher';
import type { PostRecord } from '../core/publisher';

dotenv.config();

function parseArgs(): { draftPostId: string } {
  const args = process.argv.slice(2);
  const idIndex = args.indexOf('--id');
  if (idIndex === -1 || !args[idIndex + 1]) {
    console.error('Usage: publish-post --id <draftPostId>');
    process.exit(1);
  }
  return { draftPostId: args[idIndex + 1] };
}

function printPostRecord(record: PostRecord): void {
  console.log('\n--- Post Record ---');
  console.log(`ID:              ${record.id}`);
  console.log(`Draft Post ID:   ${record.draftPostId}`);
  console.log(`Facebook Post:   ${record.facebookPostId ?? '(none)'}`);
  console.log(`Status:          ${record.status}`);
  console.log(`Published At:    ${record.publishedAt.toISOString()}`);
  if (record.errorMessage) {
    console.log(`Error:           ${record.errorMessage}`);
  }
  console.log('--- End ---\n');
}

async function main(): Promise<void> {
  initSecrets();

  const { draftPostId } = parseArgs();
  console.log(`Publishing draft post: ${draftPostId}`);

  const record = await publishDraftPost(draftPostId);
  printPostRecord(record);
  console.log('Successfully published to Facebook.');
}

main()
  .catch((err: unknown) => {
    // publishDraftPost attaches the PostRecord on failure
    const typed = err as { postRecord?: PostRecord };
    if (typed.postRecord) {
      console.error('\nPublish failed — PostRecord written:');
      printPostRecord(typed.postRecord);
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${message}`);
    process.exit(1);
  })
  .finally(() => closePool());
