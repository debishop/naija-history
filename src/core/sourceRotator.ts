import * as fs from 'fs';
import * as path from 'path';
import { getPool } from '../db/pool';

interface SeedEntry {
  url: string;
  domain: string;
  title?: string;
}

const SEEDS_PATH = path.resolve(__dirname, '../../config/article-seeds.json');

function loadSeeds(): SeedEntry[] {
  const raw = fs.readFileSync(SEEDS_PATH, 'utf8');
  return JSON.parse(raw) as SeedEntry[];
}

interface FetchedUrlRow {
  source_url: string;
}

/**
 * Returns the next article URL from the seed list that has not yet been fetched.
 * Seeds are processed in order; already-fetched URLs (matched against story_candidates.source_url) are skipped.
 * Throws if all seeds are exhausted.
 */
export async function getNextSourceUrl(): Promise<string> {
  const candidates = await getUnfetchedSourceUrls();
  if (candidates.length === 0) {
    const seeds = loadSeeds();
    throw new Error(
      `All ${seeds.length} seed URLs have already been fetched. ` +
      'Add new article URLs to config/article-seeds.json to continue autonomous operation.'
    );
  }
  return candidates[0];
}

/**
 * Returns all seed URLs that have not yet been fetched, preserving seed order.
 */
export async function getUnfetchedSourceUrls(): Promise<string[]> {
  const seeds = loadSeeds();
  const pool = getPool();

  const result = await pool.query<FetchedUrlRow>(
    'SELECT source_url FROM story_candidates'
  );
  const fetchedUrls = new Set(result.rows.map((r) => r.source_url));
  return seeds.filter((seed) => !fetchedUrls.has(seed.url)).map((seed) => seed.url);
}
