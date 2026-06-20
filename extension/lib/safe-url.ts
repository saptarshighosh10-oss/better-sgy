/**
 * safe-url.ts — scheme allowlist for any URL that came from scraped Schoology
 * HTML before it reaches window.open / tabs.create / an href. Blocks javascript:,
 * data:, vbscript:, etc. (a malicious course post could embed one). Relative URLs
 * are resolved against the current origin.
 */
const ALLOWED = new Set(['http:', 'https:', 'mailto:', 'blob:']);

export function safeExternalUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;
  try {
    // Resolve relative URLs (e.g. "/grades/grades") against the page origin.
    const base = typeof location !== 'undefined' ? location.href : undefined;
    const u = new URL(s, base);
    return ALLOWED.has(u.protocol) ? u.href : null;
  } catch {
    return null;
  }
}

/** Open a scraped URL only if its scheme is allowed. No-op otherwise. */
export function openSafe(raw: string | null | undefined): void {
  const url = safeExternalUrl(raw);
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
}
