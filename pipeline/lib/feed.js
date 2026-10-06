import { XMLParser } from 'fast-xml-parser';
import { htmlToText, normalizeSpace, safeUrl } from './text.js';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  cdataPropName: false,
  processEntities: true,
  htmlEntities: true,
  trimValues: true,
  isArray: (name) => ['item', 'entry', 'link', 'category', 'author'].includes(name),
});

const asArray = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

// A node may be a plain string, or an object like { '#text': '…', '@_type': 'html' }.
function str(v) {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (Array.isArray(v)) return str(v[0]);
  if (typeof v === 'object' && '#text' in v) return String(v['#text']);
  return '';
}

function atomLink(links) {
  const all = asArray(links);
  const alt = all.find((l) => !l['@_rel'] || l['@_rel'] === 'alternate') || all[0];
  return alt ? alt['@_href'] || str(alt) : '';
}

function parseDate(...candidates) {
  for (const c of candidates) {
    const d = new Date(str(c));
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return null;
}

// Parse RSS 2.0, RSS 1.0 (RDF) or Atom into a uniform list:
// { title, url, publishedAt, text, authors[] }
export function parseFeed(xml) {
  const doc = parser.parse(xml);

  if (doc.feed) {
    return asArray(doc.feed.entry).map((e) => ({
      title: normalizeSpace(htmlToText(str(e.title))),
      url: safeUrl(atomLink(e.link)),
      publishedAt: parseDate(e.published, e.updated),
      text: htmlToText(str(e.content) || str(e.summary)),
      authors: asArray(e.author).map((a) => str(a.name)).filter(Boolean),
    }));
  }

  const channel = doc.rss?.channel || doc['rdf:RDF'];
  if (!channel) throw new Error('Unrecognised feed format');
  const items = asArray(channel.item ?? doc['rdf:RDF']?.item);
  return items.map((i) => {
    const content = str(i['content:encoded']);
    const description = str(i.description);
    return {
      title: normalizeSpace(htmlToText(str(i.title))),
      url: safeUrl(str(i.link) || (i.guid?.['@_isPermaLink'] !== 'false' ? str(i.guid) : '')),
      publishedAt: parseDate(i.pubDate, i['dc:date'], i.published),
      // Use whichever of content/description is longer: some feeds put the full text in either.
      text: htmlToText(content.length > description.length ? content : description),
      authors: [str(i['dc:creator']), str(i.author)].filter(Boolean),
    };
  });
}
