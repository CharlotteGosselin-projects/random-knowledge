import { getJson } from '../lib/http.js';
import { safeUrl } from '../lib/text.js';

const API = 'https://hacker-news.firebaseio.com/v0';

// Top stories that link to an article (not Ask/Show HN text posts) with a decent score.
// The article text itself is fetched later, only for the items that get picked.
export async function fetchHackerNews(source) {
  const ids = (await getJson(`${API}/topstories.json`)).slice(0, 60);
  const stories = await Promise.all(
    ids.map((id) => getJson(`${API}/item/${id}.json`, { retries: 0 }).catch(() => null)),
  );
  return stories
    .filter((s) => s && s.type === 'story' && s.url && !s.dead && !s.deleted)
    .filter((s) => (s.score || 0) >= (source.minScore || 0))
    .map((s) => ({
      title: s.title,
      url: safeUrl(s.url),
      publishedAt: new Date(s.time * 1000).toISOString(),
      text: '',
      authors: [],
      discussionUrl: `https://news.ycombinator.com/item?id=${s.id}`,
      needsArticle: true,
    }));
}
