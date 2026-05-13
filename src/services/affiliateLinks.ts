import { readFileSync } from 'fs';
import { join } from 'path';

export interface AffiliateLink {
  title: string;
  url: string;
}

type AffiliateConfig = Record<string, AffiliateLink>;

let cachedConfig: AffiliateConfig | null = null;

function loadConfig(): AffiliateConfig {
  if (cachedConfig !== null) return cachedConfig;
  const configPath = process.env['AFFILIATE_LINKS_PATH'] ?? join(process.cwd(), 'config/affiliate-links.json');
  try {
    const raw = readFileSync(configPath, 'utf-8');
    cachedConfig = JSON.parse(raw) as AffiliateConfig;
  } catch {
    cachedConfig = {};
  }
  return cachedConfig;
}

/** Exposed for testing: resets the in-process config cache. */
export function resetAffiliateLinkCache(): void {
  cachedConfig = null;
}

/**
 * Scans postBody for the first keyword match in the affiliate config.
 * Longer keywords are checked first to prefer the most specific match.
 * Returns the matching AffiliateLink, or null if no match is found.
 */
export function findAffiliateMatch(postBody: string): AffiliateLink | null {
  const config = loadConfig();
  const bodyLower = postBody.toLowerCase();

  const sortedKeywords = Object.keys(config).sort((a, b) => b.length - a.length);

  for (const keyword of sortedKeywords) {
    if (bodyLower.includes(keyword.toLowerCase())) {
      return config[keyword];
    }
  }

  return null;
}

/** Builds the affiliate footer line for appending to a post. */
export function buildAffiliateFooter(link: AffiliateLink): string {
  return `📚 Want to learn more? ${link.title} — ${link.url}`;
}
