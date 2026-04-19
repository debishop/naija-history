import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';

export interface FetchedArticle {
  title: string;
  summary: string;
  rawText: string;
  publishedAt: Date | null;
}

const MAX_REDIRECTS = 5;
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_BODY_BYTES = 5 * 1024 * 1024; // 5 MB

function fetchUrl(url: string, redirectsLeft: number): Promise<string> {
  return new Promise((resolve, reject) => {
    if (redirectsLeft < 0) {
      reject(new Error('Too many redirects'));
      return;
    }

    const parsed = new URL(url);
    const lib = parsed.protocol === 'https:' ? https : http;

    const req = lib.get(
      url,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; NigeriaHistoryPipeline/1.0; +https://github.com/nigeria-history)',
          Accept: 'text/html,application/xhtml+xml',
        },
      },
      (res) => {
        if (
          res.statusCode !== undefined &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          const redirectUrl = new URL(res.headers.location, url).toString();
          res.resume();
          resolve(fetchUrl(redirectUrl, redirectsLeft - 1));
          return;
        }

        if (res.statusCode !== undefined && res.statusCode >= 400) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode} fetching ${url}`));
          return;
        }

        const chunks: Buffer[] = [];
        let totalBytes = 0;

        res.on('data', (chunk: Buffer) => {
          totalBytes += chunk.length;
          if (totalBytes > MAX_BODY_BYTES) {
            req.destroy();
            reject(new Error(`Response body too large (> ${MAX_BODY_BYTES} bytes)`));
            return;
          }
          chunks.push(chunk);
        });

        res.on('end', () => {
          resolve(Buffer.concat(chunks).toString('utf8'));
        });

        res.on('error', reject);
      }
    );

    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.destroy();
      reject(new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms`));
    });

    req.on('error', reject);
  });
}

function extractTitle(html: string): string {
  // Try og:title first, then <title>
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (ogTitle?.[1]) return ogTitle[1].trim();

  const ogTitle2 = html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
  if (ogTitle2?.[1]) return ogTitle2[1].trim();

  const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleTag?.[1]) return titleTag[1].trim();

  const h1 = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1?.[1]) return h1[1].trim();

  return 'Untitled';
}

function extractPublishedAt(html: string): Date | null {
  // Try common meta tags
  const patterns = [
    /<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']article:published_time["']/i,
    /<meta[^>]+name=["']date["'][^>]+content=["']([^"']+)["']/i,
    /<time[^>]+datetime=["']([^"']+)["']/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      const d = new Date(match[1]);
      if (!isNaN(d.getTime())) return d;
    }
  }
  return null;
}

function stripHtml(html: string): string {
  // Remove scripts, styles, noscript blocks
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, ' ');

  // Replace block-level tags with newlines
  text = text.replace(/<\/(p|div|h[1-6]|li|blockquote|article|section)>/gi, '\n');

  // Strip remaining tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

  // Collapse whitespace
  return text.replace(/\s+/g, ' ').trim();
}

export async function fetchArticle(url: string): Promise<FetchedArticle> {
  const html = await fetchUrl(url, MAX_REDIRECTS);

  const title = extractTitle(html);
  const publishedAt = extractPublishedAt(html);
  const rawText = stripHtml(html);
  const summary = rawText.slice(0, 500);

  return { title, summary, rawText, publishedAt };
}
