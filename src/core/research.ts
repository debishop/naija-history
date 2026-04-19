import * as crypto from 'crypto';
import { isWhitelisted } from '../lib/whitelist';
import { fetchArticle } from '../services/fetcher';
import { getPool } from '../db/pool';

export interface StoryCandidate {
  id: string;
  title: string;
  summary: string;
  sourceUrl: string;
  sourceName: string;
  publishedAt: Date | null;
  rawText: string;
  fetchedAt: Date;
}

const SOURCE_NAMES: Record<string, string> = {
  'bbc.com': 'BBC',
  'bbc.co.uk': 'BBC',
  'reuters.com': 'Reuters',
  'premiumtimesng.com': 'Premium Times',
  'nairametrics.com': 'Nairametrics',
  'jstor.org': 'JSTOR',
  'cambridge.org': 'Cambridge',
  'nationalarchives.gov.ng': 'National Archives of Nigeria',
  'ncmm.gov.ng': 'NCMM',
  'nationallibrary.gov.ng': 'National Library of Nigeria',
  'historicalsocietyofnigeria.org': 'Historical Society of Nigeria',
  'ui.edu.ng': 'University of Ibadan',
  'unn.edu.ng': 'University of Nigeria',
  'abu.edu.ng': 'Ahmadu Bello University',
  'yale.edu': 'Yale University',
  'loc.gov': 'Library of Congress',
  'bl.uk': 'British Library',
  'lib.washington.edu': 'University of Washington Libraries',
  'archivi.ng': 'Archivi NG',
};

function resolveSourceName(url: string): string {
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    if (SOURCE_NAMES[hostname]) return SOURCE_NAMES[hostname];

    // Check suffix matches (e.g. news.bbc.com → bbc.com)
    const parts = hostname.split('.');
    for (let i = 1; i < parts.length; i++) {
      const suffix = parts.slice(i).join('.');
      if (SOURCE_NAMES[suffix]) return SOURCE_NAMES[suffix];
    }

    // Fallback: capitalise the second-level domain
    if (parts.length >= 2) {
      const sld = parts[parts.length - 2];
      return sld.charAt(0).toUpperCase() + sld.slice(1);
    }
    return hostname;
  } catch {
    return 'Unknown';
  }
}

export function contentHash(text: string): string {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
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

function rowToCandidate(row: DbRow): StoryCandidate {
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

export async function fetchStory(url: string): Promise<StoryCandidate> {
  if (!isWhitelisted(url)) {
    throw new Error(
      `Domain not whitelisted: "${url}". Only approved sources are permitted.`
    );
  }

  const article = await fetchArticle(url);
  const hash = contentHash(article.rawText);
  const sourceName = resolveSourceName(url);
  const sourceDomain = new URL(url).hostname.toLowerCase();

  const pool = getPool();

  // Dedup: return existing record if content hash already stored
  const existing = await pool.query<DbRow>(
    'SELECT id, title, summary, source_url, source_name, published_at, raw_content, fetched_at FROM story_candidates WHERE content_hash = $1',
    [hash]
  );
  if (existing.rows.length > 0) {
    return rowToCandidate(existing.rows[0]);
  }

  const inserted = await pool.query<DbRow>(
    `INSERT INTO story_candidates
       (source_url, source_domain, source_name, title, summary, raw_content, content_hash, published_at, fetched_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
     RETURNING id, title, summary, source_url, source_name, published_at, raw_content, fetched_at`,
    [
      url,
      sourceDomain,
      sourceName,
      article.title,
      article.summary,
      article.rawText,
      hash,
      article.publishedAt,
    ]
  );

  return rowToCandidate(inserted.rows[0]);
}
