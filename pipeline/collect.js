import { FETCHERS } from './fetchers/index.js';
import { fetchArticleText } from './lib/article.js';
import { seededRandom, shuffle } from './lib/random.js';
import { urlKey, wordCount, truncate } from './lib/text.js';
import { MIN_WORDS, MIN_WORDS_PARTIAL, MAX_CHARS } from './sources.js';

// Fetch every source of one category. A failing source is logged and skipped,
// so one broken feed never stops the digest.
export async function fetchCategory(category, sources, { now, seen, fetchers = FETCHERS, log = console }) {
  const report = [];
  const candidates = [];
  await Promise.all(
    sources.map(async (source) => {
      try {
        const raw = await fetchers[source.type](source, now);
        const fresh = raw.filter((item) => isUsable(item, source, now, seen));
        report.push({ source: source.id, fetched: raw.length, usable: fresh.length });
        for (const item of fresh) candidates.push(toCandidate(item, source, category));
      } catch (err) {
        report.push({ source: source.id, error: err.message });
        log.warn(`[${category}] ${source.id} failed: ${err.message}`);
      }
    }),
  );
  return { candidates, report };
}

function isUsable(item, source, now, seen) {
  if (!item.url || !item.title || !item.publishedAt) return false;
  const ageDays = (now - new Date(item.publishedAt)) / 86400000;
  if (ageDays > source.maxAgeDays || ageDays < -1) return false;
  return !seen.has(urlKey(item.url));
}

function toCandidate(item, source, category) {
  return {
    category,
    sourceId: source.id,
    sourceName: source.name,
    lang: source.lang,
    preprint: Boolean(source.preprint),
    partial: Boolean(source.partial),
    needsArticle: Boolean(item.needsArticle || source.fetchArticle),
    title: item.title,
    url: item.url,
    discussionUrl: item.discussionUrl,
    publishedAt: item.publishedAt,
    authors: item.authors || [],
    venue: item.venue,
    text: item.text || '',
  };
}

// Random order, but interleaved by source so one prolific feed (arXiv posts hundreds a day)
// does not crowd out the others: every source gets one slot before any gets a second.
export function orderCandidates(candidates, seed) {
  const rand = seededRandom(seed);
  const perSource = new Map();
  // Sort first: sources finish fetching in random order, and the pick must not depend on that.
  const stable = [...candidates].sort((a, b) => (a.url < b.url ? -1 : a.url > b.url ? 1 : 0));
  const ranked = shuffle(stable, rand).map((c) => {
    const n = perSource.get(c.sourceId) || 0;
    perSource.set(c.sourceId, n + 1);
    return { c, round: n };
  });
  return ranked.sort((a, b) => a.round - b.round).map((r) => r.c);
}

// Walk the ordered candidates, downloading article text where needed, until we have
// `count` items with enough text to summarize. Duplicate URLs across sources are skipped.
export async function selectCandidates(ordered, count, { fetchArticle = fetchArticleText, maxAttempts = 30 } = {}) {
  const chosen = [];
  const keys = new Set();
  let attempts = 0;
  for (const cand of ordered) {
    if (chosen.length >= count || attempts >= maxAttempts) break;
    const key = urlKey(cand.url);
    if (keys.has(key)) continue;
    attempts++;
    let text = cand.text;
    if (cand.needsArticle && !cand.partial) {
      const article = await fetchArticle(cand.url);
      if (wordCount(article) > wordCount(text)) text = article;
    }
    const min = cand.partial ? MIN_WORDS_PARTIAL : MIN_WORDS;
    // Abstracts are short but dense; accept them from ~120 words.
    const floor = cand.category === 'science' && !cand.needsArticle ? Math.min(min, 120) : min;
    if (wordCount(text) < floor) continue;
    keys.add(key);
    chosen.push({ ...cand, text: truncate(text, MAX_CHARS), sourceWords: wordCount(text) });
  }
  return chosen;
}
