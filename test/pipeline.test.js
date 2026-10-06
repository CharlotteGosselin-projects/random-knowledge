import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, readdir, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseFeed } from '../pipeline/lib/feed.js';
import { htmlToText, urlKey, safeUrl, wordCount } from '../pipeline/lib/text.js';
import { orderCandidates, selectCandidates } from '../pipeline/collect.js';
import { validateSummary, extractJson, buildPrompt } from '../pipeline/summarize.js';
import { generateDigest } from '../pipeline/run.js';

const fixture = (name) => readFile(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const words = (n, w = 'word') => Array.from({ length: n }, () => w).join(' ');
const quiet = { log() {}, warn() {} };

test('parses RSS 2.0 with full content, entities and authors', async () => {
  const [a, b] = parseFeed(await fixture('rss.xml'));
  assert.equal(a.title, 'Inquiry finds & reports');
  assert.equal(a.url, 'https://example.org/inquiry?utm_source=rss');
  assert.equal(a.publishedAt, '2026-10-05T08:00:00.000Z');
  assert.match(a.text, /First paragraph with bold\.\nSecond paragraph\./);
  assert.doesNotMatch(a.text, /alert/);
  assert.deepEqual(a.authors, ['Jane Doe']);
  assert.equal(b.url, null, 'non-permalink guid is not a URL');
});

test('parses Atom and picks the alternate link', async () => {
  const [e] = parseFeed(await fixture('atom.xml'));
  assert.equal(e.title, 'Refactoring safely');
  assert.equal(e.url, 'https://blog.example.com/refactoring');
  assert.equal(e.text, 'Full content here.');
  assert.deepEqual(e.authors, ['Ada']);
});

test('text helpers', () => {
  assert.equal(htmlToText('<p>a&amp;b</p><p>c</p>'), 'a&b\nc');
  assert.equal(urlKey('https://www.x.org/a/?utm_medium=x&id=2#top'), 'x.org/a?id=2');
  assert.equal(safeUrl('javascript:alert(1)'), null);
  assert.equal(wordCount(' one two  three '), 3);
});

const cand = (sourceId, i, extra = {}) => ({
  category: 'coding', sourceId, sourceName: sourceId, url: `https://${sourceId}.org/${i}`,
  title: `t${i}`, text: words(300), needsArticle: false, partial: false, ...extra,
});

test('ordering is deterministic and interleaves sources', () => {
  const list = [...Array.from({ length: 20 }, (_, i) => cand('big', i)), cand('small', 1), cand('tiny', 1)];
  const a = orderCandidates(list, '2026-10-06:coding');
  const b = orderCandidates([...list].reverse(), '2026-10-06:coding');
  assert.deepEqual(a.map((c) => c.url), b.map((c) => c.url));
  assert.deepEqual(new Set(a.slice(0, 3).map((c) => c.sourceId)), new Set(['big', 'small', 'tiny']));
  assert.notDeepEqual(orderCandidates(list, 'other-day').map((c) => c.url), a.map((c) => c.url));
});

test('selection skips thin items, fetches articles and drops duplicate URLs', async () => {
  const ordered = [
    cand('a', 1, { text: 'too short' }),
    cand('b', 1, { text: '', needsArticle: true }),
    cand('c', 1, { url: 'https://b.org/1?utm_source=x' }),
    cand('d', 1, { text: words(80), partial: true }),
    cand('e', 1),
  ];
  const fetched = [];
  const picked = await selectCandidates(ordered, 3, {
    fetchArticle: async (url) => (fetched.push(url), words(400)),
  });
  assert.deepEqual(picked.map((p) => p.sourceId), ['b', 'd', 'e']);
  assert.deepEqual(fetched, ['https://b.org/1']);
});

const block = (n = 200) => ({ title: 'T', tldr: 'One line.', summary: words(n), why_it_matters: 'Because.', key_terms: ['a', 'b', 'c'] });

test('validation enforces both languages and ~200 words', () => {
  const item = { partial: false };
  assert.deepEqual(validateSummary({ kind: 'news', en: block(), fr: block() }, item), []);
  assert.match(validateSummary({ kind: 'news', en: block(90), fr: block() }, item).join(), /en\.summary has 90 words/);
  assert.match(validateSummary({ kind: 'news', en: block() }, item).join(), /"fr" block is missing/);
  assert.deepEqual(validateSummary({ kind: 'news', en: block(90), fr: block(90) }, { partial: true }), []);
});

test('extractJson tolerates code fences', () => {
  assert.deepEqual(extractJson('```json\n{"a":1}\n```'), { a: 1 });
  assert.throws(() => extractJson('nope'));
});

test('prompt carries preprint and paywall notes', () => {
  const p = buildPrompt({ ...cand('arxiv', 1), category: 'science', preprint: true, partial: false, lang: 'en', publishedAt: 'x' });
  assert.match(p, /PREPRINT/);
  assert.match(p, /about 200 words/);
  assert.match(buildPrompt({ ...cand('m', 1), partial: true, lang: 'fr', publishedAt: 'x' }), /paywall/);
});

test('end to end: writes digest and index, uses spares, skips reruns, dedupes later days', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'rk-test-'));
  const now = new Date('2026-10-06T05:00:00Z');
  const item = (i) => ({ title: `Story ${i}`, url: `https://news.example/${i}`, publishedAt: '2026-10-05T12:00:00Z', text: words(300), authors: [] });
  const categories = {
    coding: [{ id: 'one', name: 'One', type: 'fake', maxAgeDays: 3, lang: 'en' }],
    politics: [
      { id: 'two', name: 'Two', type: 'fake', maxAgeDays: 3, lang: 'en' },
      { id: 'broken', name: 'Broken', type: 'boom', maxAgeDays: 3, lang: 'en' },
    ],
  };
  const fetchers = {
    fake: async (s) => Array.from({ length: 5 }, (_, i) => item(`${s.id}-${i}`)),
    boom: async () => { throw new Error('feed down'); },
  };
  // The first article Claude sees always gets a too-short summary, so it is dropped and a spare is used.
  let poison;
  const ask = async (prompt) => {
    const url = prompt.match(/^URL: (\S+)$/m)[1];
    poison ??= url;
    return { kind: 'news', en: block(url === poison ? 20 : 200), fr: block() };
  };

  const first = await generateDigest({ now, dataDir, fetchers, ask, categories, log: quiet, fetchArticle: async () => '' });
  assert.equal(first.total, 6);
  const digest = JSON.parse(await readFile(join(dataDir, 'digests/2026-10-06.json'), 'utf8'));
  assert.equal(digest.categories.coding.length, 3);
  assert.equal(digest.categories.politics.length, 3);
  assert.equal(digest.categories.coding[0].en.title, 'T');
  assert.equal(digest.report.politics.sources.find((s) => s.source === 'broken').error, 'feed down');
  assert.equal(digest.report.coding.failures.length, 1);

  const again = await generateDigest({ now, dataDir, fetchers, ask, categories, log: quiet });
  assert.equal(again.skipped, true);

  await generateDigest({ now: new Date('2026-10-07T05:00:00Z'), dataDir, fetchers, ask, categories, log: quiet, fetchArticle: async () => '' });
  const day2 = JSON.parse(await readFile(join(dataDir, 'digests/2026-10-07.json'), 'utf8'));
  const day1Urls = new Set(Object.values(digest.categories).flat().map((i) => i.url));
  for (const i of Object.values(day2.categories).flat()) assert.ok(!day1Urls.has(i.url), `${i.url} repeated`);
  const index = JSON.parse(await readFile(join(dataDir, 'index.json'), 'utf8'));
  assert.deepEqual(index, { latest: '2026-10-07', dates: ['2026-10-07', '2026-10-06'] });
});
