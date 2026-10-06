import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';
import { getText } from './http.js';
import { normalizeSpace } from './text.js';

// Download a page and extract its main readable text. Returns '' when extraction fails.
export async function fetchArticleText(url) {
  try {
    const res = await getText(url, { accept: 'text/html', retries: 0 });
    return extractArticleText(res, url);
  } catch {
    return '';
  }
}

export function extractArticleText(html, url) {
  const { document } = parseHTML(html);
  try {
    // Readability resolves relative links against the document URL.
    Object.defineProperty(document, 'baseURI', { value: url, configurable: true });
  } catch {}
  const parsed = new Readability(document).parse();
  return parsed?.textContent ? normalizeSpace(parsed.textContent) : '';
}
