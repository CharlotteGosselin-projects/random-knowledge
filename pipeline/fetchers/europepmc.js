import { getJson } from '../lib/http.js';
import { isoDay } from '../lib/dates.js';

// Recently published, open-access, peer-reviewed papers indexed in PubMed (SRC:MED).
export async function fetchEuropePmc(source, now) {
  const from = isoDay(new Date(now.getTime() - source.maxAgeDays * 86400000));
  const to = isoDay(now);
  const query = `OPEN_ACCESS:y AND SRC:MED AND HAS_ABSTRACT:y AND FIRST_PDATE:[${from} TO ${to}]`;
  const url =
    'https://www.ebi.ac.uk/europepmc/webservices/rest/search' +
    `?query=${encodeURIComponent(query)}&resultType=core&format=json&pageSize=100`;
  const data = await getJson(url, { timeoutMs: 40000 });
  return (data.resultList?.result || [])
    .filter((r) => !/review|editorial|comment|erratum|retract/i.test((r.pubTypeList?.pubType || []).join(' ')))
    .map((r) => ({
      title: r.title?.replace(/\.$/, ''),
      url: r.doi ? `https://doi.org/${r.doi}` : `https://europepmc.org/article/MED/${r.pmid}`,
      publishedAt: new Date(`${r.firstPublicationDate}T12:00:00Z`).toISOString(),
      text: r.abstractText || '',
      authors: (r.authorList?.author || []).map((a) => a.fullName).filter(Boolean).slice(0, 6),
      venue: r.journalInfo?.journal?.title,
    }));
}
