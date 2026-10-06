import { getJson } from '../lib/http.js';
import { isoDay } from '../lib/dates.js';

// bioRxiv and medRxiv share one API: /details/{server}/{from}/{to}/{cursor}
export async function fetchBiorxiv(source, now) {
  const from = isoDay(new Date(now.getTime() - source.maxAgeDays * 86400000));
  const to = isoDay(now);
  const data = await getJson(`https://api.biorxiv.org/details/${source.server}/${from}/${to}/0`, { timeoutMs: 40000 });
  return (data.collection || []).map((p) => ({
    title: p.title,
    url: `https://www.${source.server}.org/content/${p.doi}v${p.version}`,
    publishedAt: new Date(`${p.date}T12:00:00Z`).toISOString(),
    text: p.abstract || '',
    authors: String(p.authors || '').split(';').map((a) => a.trim()).filter(Boolean).slice(0, 6),
    topic: p.category,
  }));
}
