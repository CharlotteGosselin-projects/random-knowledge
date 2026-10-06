import { mkdir, readdir, readFile, writeFile, access } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATEGORIES, ITEMS_PER_CATEGORY, SPARES_PER_CATEGORY } from './sources.js';
import { fetchCategory, orderCandidates, selectCandidates } from './collect.js';
import { claudeCli, summarizeItem } from './summarize.js';
import { isoDay } from './lib/dates.js';
import { urlKey } from './lib/text.js';
import { FETCHERS } from './fetchers/index.js';
import { fetchArticleText } from './lib/article.js';

const ROOT = resolve(fileURLToPath(import.meta.url), '../..');
// Past digests whose links must not be picked again.
const DEDUPE_DAYS = 60;

export async function generateDigest({
  now = new Date(),
  dataDir = join(ROOT, 'data'),
  fetchers = FETCHERS,
  fetchArticle = fetchArticleText,
  ask = claudeCli(),
  categories = CATEGORIES,
  log = console,
} = {}) {
  const date = isoDay(now);
  const digestDir = join(dataDir, 'digests');
  const outFile = join(digestDir, `${date}.json`);
  await mkdir(digestDir, { recursive: true });

  if (await exists(outFile)) {
    log.log(`Digest for ${date} already exists, nothing to do.`);
    return { date, skipped: true };
  }

  const seen = await loadSeenUrls(digestDir);
  const digest = { date, generatedAt: now.toISOString(), categories: {}, report: {} };

  for (const [category, sources] of Object.entries(categories)) {
    const { candidates, report } = await fetchCategory(category, sources, { now, seen, fetchers, log });
    const ordered = orderCandidates(candidates, `${date}:${category}`);
    const picked = await selectCandidates(ordered, ITEMS_PER_CATEGORY + SPARES_PER_CATEGORY, { fetchArticle });
    log.log(`[${category}] ${candidates.length} candidates, ${picked.length} with enough text`);

    const items = [];
    const failures = [];
    // Summarize in batches of ITEMS_PER_CATEGORY; spares are only used if something fails.
    let cursor = 0;
    while (items.length < ITEMS_PER_CATEGORY && cursor < picked.length) {
      const batch = picked.slice(cursor, cursor + ITEMS_PER_CATEGORY - items.length);
      cursor += batch.length;
      const results = await Promise.allSettled(batch.map((item) => summarizeItem(item, ask)));
      results.forEach((r, j) => {
        if (r.status === 'fulfilled') items.push(toDigestItem(batch[j], r.value, date, items.length));
        else {
          failures.push({ url: batch[j].url, error: r.reason.message });
          log.warn(`[${category}] could not summarize ${batch[j].url}: ${r.reason.message}`);
        }
      });
    }
    digest.categories[category] = items;
    digest.report[category] = { sources: report, failures };
  }

  const total = Object.values(digest.categories).reduce((n, list) => n + list.length, 0);
  if (total === 0) throw new Error('No item could be fetched and summarized today; keeping the previous digest.');

  await writeFile(outFile, JSON.stringify(digest, null, 2) + '\n');
  await updateIndex(dataDir, digestDir);
  log.log(`Wrote ${outFile} with ${total} items.`);
  return { date, total, digest };
}

function toDigestItem(item, summary, date, n) {
  return {
    id: `${date}-${item.category}-${n + 1}`,
    category: item.category,
    source: item.sourceName,
    sourceLang: item.lang,
    url: item.url,
    discussionUrl: item.discussionUrl,
    publishedAt: item.publishedAt,
    authors: item.authors.slice(0, 6),
    venue: item.venue,
    badges: { preprint: item.preprint, partial: item.partial },
    kind: summary.kind,
    en: summary.en,
    fr: summary.fr,
  };
}

async function loadSeenUrls(digestDir) {
  const seen = new Set();
  const files = (await readdir(digestDir)).filter((f) => f.endsWith('.json')).sort().slice(-DEDUPE_DAYS);
  for (const f of files) {
    const digest = JSON.parse(await readFile(join(digestDir, f), 'utf8'));
    for (const list of Object.values(digest.categories || {})) for (const item of list) seen.add(urlKey(item.url));
  }
  return seen;
}

async function updateIndex(dataDir, digestDir) {
  const dates = (await readdir(digestDir))
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .map((f) => f.slice(0, 10))
    .sort()
    .reverse();
  await writeFile(join(dataDir, 'index.json'), JSON.stringify({ latest: dates[0], dates }, null, 2) + '\n');
}

const exists = (p) => access(p).then(() => true, () => false);

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  generateDigest().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
