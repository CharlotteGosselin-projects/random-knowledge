// Every source the daily digest can pick from. Edit this file to add or remove one.
//
// type:          which fetcher reads it (see pipeline/fetchers/).
// maxAgeDays:    items older than this are ignored. Blogs that post rarely get a wider window.
// fetchArticle:  the feed only carries a teaser, so download the page and extract the main text.
// partial:       the outlet is paywalled; we only ever see the free intro, and the card says so.
// preprint:      not peer-reviewed; the card shows a badge and the summary says so.
// lang:          language of the original text.

export const ITEMS_PER_CATEGORY = 3;
// Extra candidates kept per category in case a summary fails validation.
export const SPARES_PER_CATEGORY = 3;

export const CATEGORIES = {
  coding: [
    { id: 'github-blog', name: 'GitHub Blog', type: 'rss', url: 'https://github.blog/feed/', maxAgeDays: 7, lang: 'en' },
    { id: 'martin-fowler', name: 'Martin Fowler', type: 'rss', url: 'https://martinfowler.com/feed.atom', maxAgeDays: 30, lang: 'en' },
    { id: 'julia-evans', name: 'Julia Evans', type: 'rss', url: 'https://jvns.ca/atom.xml', maxAgeDays: 30, lang: 'en' },
    { id: 'hacker-news', name: 'Hacker News', type: 'hackernews', maxAgeDays: 2, minScore: 150, lang: 'en' },
  ],
  science: [
    {
      id: 'arxiv', name: 'arXiv', type: 'arxiv', maxAgeDays: 4, preprint: true, lang: 'en',
      categories: ['cs.AI', 'cs.CL', 'quant-ph', 'astro-ph.EP', 'astro-ph.GA', 'q-bio.NC', 'cond-mat.mtrl-sci', 'physics.ao-ph'],
    },
    { id: 'biorxiv', name: 'bioRxiv', type: 'biorxiv', server: 'biorxiv', maxAgeDays: 3, preprint: true, lang: 'en' },
    { id: 'medrxiv', name: 'medRxiv', type: 'biorxiv', server: 'medrxiv', maxAgeDays: 3, preprint: true, lang: 'en' },
    { id: 'europepmc', name: 'Europe PMC', type: 'europepmc', maxAgeDays: 4, lang: 'en' },
    { id: 'plos-one', name: 'PLOS ONE', type: 'rss', url: 'https://journals.plos.org/plosone/feed/atom', maxAgeDays: 4, lang: 'en' },
    { id: 'plos-biology', name: 'PLOS Biology', type: 'rss', url: 'https://journals.plos.org/plosbiology/feed/atom', maxAgeDays: 7, lang: 'en' },
    { id: 'nature-news', name: 'Nature', type: 'rss', url: 'https://www.nature.com/nature.rss', maxAgeDays: 4, fetchArticle: true, lang: 'en' },
    { id: 'science-news', name: 'Science', type: 'rss', url: 'https://www.science.org/rss/news_current.xml', maxAgeDays: 4, fetchArticle: true, lang: 'en' },
  ],
  politics: [
    { id: 'propublica', name: 'ProPublica', type: 'rss', url: 'https://www.propublica.org/feeds/propublica/main', maxAgeDays: 4, fetchArticle: true, lang: 'en' },
    { id: 'mediapart', name: 'Mediapart', type: 'rss', url: 'https://www.mediapart.fr/articles/feed', maxAgeDays: 2, partial: true, lang: 'fr' },
    { id: 'bellingcat', name: 'Bellingcat', type: 'rss', url: 'https://www.bellingcat.com/feed/', maxAgeDays: 7, lang: 'en' },
    { id: 'the-conversation', name: 'The Conversation', type: 'rss', url: 'https://theconversation.com/global/articles.atom', maxAgeDays: 3, lang: 'en' },
    { id: 'the-conversation-fr', name: 'The Conversation France', type: 'rss', url: 'https://theconversation.com/fr/articles.atom', maxAgeDays: 3, lang: 'fr' },
    { id: 'monde-diplo', name: 'Le Monde diplomatique', type: 'rss', url: 'https://www.monde-diplomatique.fr/rss/', maxAgeDays: 14, partial: true, lang: 'fr' },
    { id: 'reporterre', name: 'Reporterre', type: 'rss', url: 'https://reporterre.net/spip.php?page=backend', maxAgeDays: 3, fetchArticle: true, lang: 'fr' },
    { id: 'guardian-world', name: 'The Guardian', type: 'rss', url: 'https://www.theguardian.com/world/rss', maxAgeDays: 2, fetchArticle: true, lang: 'en' },
    { id: 'guardian-politics', name: 'The Guardian', type: 'rss', url: 'https://www.theguardian.com/politics/rss', maxAgeDays: 2, fetchArticle: true, lang: 'en' },
  ],
};

// Below this many words of source text, an item is too thin to summarize in ~200 words.
// Paywalled outlets only give an intro, so they get a lower bar (and the "partial" badge).
export const MIN_WORDS = 250;
export const MIN_WORDS_PARTIAL = 60;
// Text sent to Claude is cut to this many characters.
export const MAX_CHARS = 14000;
