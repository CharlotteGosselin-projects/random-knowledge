import { fetchRss } from './rss.js';
import { fetchHackerNews } from './hackernews.js';
import { fetchArxiv } from './arxiv.js';
import { fetchBiorxiv } from './biorxiv.js';
import { fetchEuropePmc } from './europepmc.js';

export const FETCHERS = {
  rss: fetchRss,
  hackernews: fetchHackerNews,
  arxiv: fetchArxiv,
  biorxiv: fetchBiorxiv,
  europepmc: fetchEuropePmc,
};
