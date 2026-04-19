import * as fs from 'fs';
import * as path from 'path';

interface WhitelistConfig {
  domains: string[];
}

function loadConfig(configPath: string): WhitelistConfig {
  const raw = fs.readFileSync(configPath, 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !Array.isArray((parsed as Record<string, unknown>).domains)
  ) {
    throw new Error(`Invalid whitelist config at ${configPath}: expected { domains: string[] }`);
  }
  return parsed as WhitelistConfig;
}

const DEFAULT_CONFIG_PATH = path.resolve(__dirname, '../../config/whitelist.json');

let _domains: Set<string> | null = null;

function getDomains(): Set<string> {
  if (!_domains) {
    const config = loadConfig(DEFAULT_CONFIG_PATH);
    _domains = new Set(config.domains.map((d) => d.toLowerCase()));
  }
  return _domains;
}

/**
 * Returns true if the given URL's hostname is on the approved source whitelist.
 *
 * Rules:
 * - Subdomains are accepted if the parent domain is whitelisted
 *   (e.g. news.bbc.co.uk passes because bbc.co.uk is whitelisted)
 * - Comparison is case-insensitive
 */
export function isWhitelisted(url: string): boolean {
  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }

  const domains = getDomains();
  if (domains.has(hostname)) return true;

  // Check if any suffix matches a whitelisted domain
  const parts = hostname.split('.');
  for (let i = 1; i < parts.length - 1; i++) {
    const suffix = parts.slice(i).join('.');
    if (domains.has(suffix)) return true;
  }
  return false;
}

/** Reload config from disk (useful in tests or after config change). */
export function reloadWhitelist(): void {
  _domains = null;
}
