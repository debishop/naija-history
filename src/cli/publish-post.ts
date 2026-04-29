import * as dotenv from 'dotenv';
import { initSecrets } from '../services/secrets';
import { closePool } from '../db/pool';
import { publishDraftPost, scheduleEngagementSnapshot } from '../core/publisher';
import { notifySlack } from '../services/notifications';
import type { PostRecord } from '../core/publisher';

dotenv.config();

interface ParsedArgs {
  draftPostId: string;
  priority: 'normal' | 'critical';
}

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  const idIndex = args.indexOf('--id');
  if (idIndex === -1 || !args[idIndex + 1]) {
    console.error('Usage: publish-post --id <draftPostId> [--priority critical]');
    process.exit(1);
  }

  const priorityIndex = args.indexOf('--priority');
  const priorityValue = priorityIndex !== -1 ? args[priorityIndex + 1] : 'normal';
  if (priorityValue !== 'normal' && priorityValue !== 'critical') {
    console.error('--priority must be "normal" or "critical"');
    process.exit(1);
  }

  return { draftPostId: args[idIndex + 1], priority: priorityValue };
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

  const { draftPostId, priority } = parseArgs();

  if (priority === 'critical') {
    console.log(`PRIORITY PUBLISH: Draft ${draftPostId} — auto-approving and publishing immediately.`);
  } else {
    console.log(`Publishing draft post: ${draftPostId}`);
  }

  const skipApprovalCheck = priority === 'critical';
  const record = await publishDraftPost(draftPostId, { skipApprovalCheck });
  await scheduleEngagementSnapshot(record.id);
  printPostRecord(record);

  const facebookPostUrl = record.facebookPostId
    ? `https://www.facebook.com/${record.facebookPostId}`
    : '(URL not available)';

  await notifySlack({
    event: 'published',
    facebookPostUrl,
    excerpt: `[${priority === 'critical' ? 'PRIORITY' : 'Standard'}] Published to Facebook.`,
  });

  console.log('Successfully published to Facebook.');
}

main()
  .catch((err: unknown) => {
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
