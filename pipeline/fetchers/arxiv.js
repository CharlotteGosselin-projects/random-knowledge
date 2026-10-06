import { getText } from '../lib/http.js';
import { parseFeed } from '../lib/feed.js';

// One request to the arXiv API for the most recent submissions across the configured categories.
// arXiv asks for at most one request every 3 seconds; we only make one per day.
export async function fetchArxiv(source) {
  const query = source.categories.map((c) => `cat:${c}`).join('+OR+');
  const url =
    `https://export.arxiv.org/api/query?search_query=${query}` +
    '&sortBy=submittedDate&sortOrder=descending&max_results=80';
  const items = parseFeed(await getText(url, { timeoutMs: 40000 }));
  return items.map((i) => ({ ...i, url: i.url?.replace(/^http:/, 'https:') }));
}
