import { describe, it, expect, beforeEach } from 'vitest';
import { isWhitelisted, reloadWhitelist } from '../../src/lib/whitelist';

describe('isWhitelisted', () => {
  beforeEach(() => {
    reloadWhitelist();
  });

  it('accepts URLs from whitelisted domains', () => {
    expect(isWhitelisted('https://bbc.com/news/world-africa-12345')).toBe(true);
    expect(isWhitelisted('https://reuters.com/article/nigeria-history')).toBe(true);
    expect(isWhitelisted('https://premiumtimesng.com/news/top-news/12345')).toBe(true);
    expect(isWhitelisted('https://jstor.org/stable/12345')).toBe(true);
  });

  it('accepts subdomains of whitelisted domains', () => {
    expect(isWhitelisted('https://news.bbc.co.uk/article')).toBe(true);
    expect(isWhitelisted('https://www.reuters.com/article')).toBe(true);
    expect(isWhitelisted('https://stable.jstor.org/article')).toBe(true);
  });

  it('rejects URLs from non-whitelisted domains', () => {
    expect(isWhitelisted('https://blogspot.com/fake-history')).toBe(false);
    expect(isWhitelisted('https://naijagist.com/article')).toBe(false);
    expect(isWhitelisted('https://random-news.com/nigeria')).toBe(false);
  });

  it('rejects invalid URLs', () => {
    expect(isWhitelisted('not-a-url')).toBe(false);
    expect(isWhitelisted('')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isWhitelisted('https://BBC.COM/news')).toBe(true);
    expect(isWhitelisted('https://REUTERS.COM/article')).toBe(true);
  });
});
