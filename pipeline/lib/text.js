import { parseHTML } from 'linkedom';

const BLOCK_TAGS = /<\/?(p|div|br|li|ul|ol|h[1-6]|blockquote|section|article|tr|figure|figcaption)[^>]*>/gi;

// HTML fragment -> plain text with entities decoded and whitespace collapsed.
export function htmlToText(html) {
  if (!html) return '';
  const spaced = String(html).replace(BLOCK_TAGS, '\n');
  const { document } = parseHTML(`<!doctype html><html><body>${spaced}</body></html>`);
  for (const el of document.querySelectorAll('script, style, noscript')) el.remove();
  return normalizeSpace(document.body.textContent || '');
}

export function normalizeSpace(text) {
  return String(text)
    .replace(/[ \t ]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

export function wordCount(text) {
  const m = String(text || '').trim().match(/\S+/g);
  return m ? m.length : 0;
}

export function truncate(text, maxChars) {
  if (text.length <= maxChars) return text;
  const cut = text.slice(0, maxChars);
  const lastStop = cut.lastIndexOf('. ');
  return (lastStop > maxChars * 0.7 ? cut.slice(0, lastStop + 1) : cut) + ' […]';
}

// Only keep http(s) links; anything else (javascript:, data:) is dropped.
export function safeUrl(url) {
  try {
    const u = new URL(String(url).trim());
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch {
    return null;
  }
}

// Canonical form used to detect duplicates across sources and days.
export function urlKey(url) {
  try {
    const u = new URL(url);
    for (const p of [...u.searchParams.keys()]) {
      if (/^(utm_|ref$|src$|CMP$|via$)/i.test(p)) u.searchParams.delete(p);
    }
    u.hash = '';
    return (u.host.replace(/^www\./, '') + u.pathname.replace(/\/$/, '') + u.search).toLowerCase();
  } catch {
    return String(url);
  }
}
