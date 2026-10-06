import { getText } from '../lib/http.js';
import { parseFeed } from '../lib/feed.js';

export async function fetchRss(source) {
  const xml = await getText(source.url, { accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml' });
  return parseFeed(xml);
}
