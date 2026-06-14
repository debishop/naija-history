/**
 * CLI: publish-approved-post
 *
 * Publishes an approved post (image + caption) to the Facebook Page with zero
 * manual arg assembly. Validates the caption for word count, CC BY-SA credit
 * line, and YouTube video link before calling the Graph API.
 *
 * Usage:
 *   ts-node src/cli/publish-approved-post.ts \
 *     --image-url <url> \
 *     --caption-file <path>  # or --caption <inline text> \
 *     [--post-id <approvedPostId>]
 *
 * Env vars (via Doppler naija-history/prd):
 *   FACEBOOK_PAGE_ID, FACEBOOK_SYSTEM_USER_TOKEN (or FACEBOOK_PAGE_ACCESS_TOKEN)
 */
import * as dotenv from 'dotenv';
dotenv.config();

import * as fs from 'fs';
import { initSecrets } from '../services/secrets';
import { validateApprovedPost, publishApprovedPost } from '../core/approvedPostPublisher';
import type { ApprovedPostInput } from '../core/approvedPostPublisher';

function parseArgs(): ApprovedPostInput {
  const argv = process.argv.slice(2);

  function getFlag(flag: string): string | undefined {
    const idx = argv.indexOf(flag);
    return idx !== -1 ? argv[idx + 1] : undefined;
  }

  const imageUrl = getFlag('--image-url');
  const captionInline = getFlag('--caption');
  const captionFile = getFlag('--caption-file');
  const approvedPostId = getFlag('--post-id') ?? `cli-${process.pid}`;

  if (!imageUrl) {
    console.error('Error: --image-url is required');
    console.error(
      'Usage: publish-approved-post --image-url <url> ' +
        '(--caption <text> | --caption-file <path>) [--post-id <id>]'
    );
    process.exit(1);
  }

  let caption: string | undefined;

  if (captionFile) {
    if (!fs.existsSync(captionFile)) {
      console.error(`Error: caption file not found: ${captionFile}`);
      process.exit(1);
    }
    caption = fs.readFileSync(captionFile, 'utf8').trim();
  } else if (captionInline) {
    caption = captionInline;
  }

  if (!caption) {
    console.error('Error: --caption or --caption-file is required');
    console.error(
      'Usage: publish-approved-post --image-url <url> ' +
        '(--caption <text> | --caption-file <path>) [--post-id <id>]'
    );
    process.exit(1);
  }

  return { imageUrl, caption, approvedPostId };
}

async function main(): Promise<void> {
  initSecrets();

  const input = parseArgs();

  console.log(`Approved-post ID: ${input.approvedPostId}`);
  console.log(`Image URL:        ${input.imageUrl}`);
  console.log(`Caption words:    ${input.caption.split(/\s+/).filter(Boolean).length}`);
  console.log('');

  console.log('Validating...');
  validateApprovedPost(input);
  console.log('Validation passed.');

  console.log('Publishing to Facebook...');
  const result = await publishApprovedPost(input);

  console.log('');
  console.log('--- Publish Result ---');
  console.log(`Post ID:   ${result.postId}`);
  console.log(`Permalink: ${result.permalink}`);
  console.log('--- End ---');
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Error: ${message}`);
  process.exit(1);
});
