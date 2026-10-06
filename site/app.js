// Random Knowledge front end. Reads data/index.json and data/digests/<date>.json; no AI runs here.
// All digest text is inserted with textContent, never as HTML.

const CATEGORY_ORDER = ['coding', 'science', 'politics'];

const STRINGS = {
  en: {
    tagline: 'Every day, three coding reads, three science papers and three independent politics stories, explained in about 200 words each.',
    coding: 'Code', science: 'Science', politics: 'Politics',
    surprise: 'Surprise me', surpriseFrom: (d) => `A random pick from ${d}`, close: 'Close',
    prev: 'Previous', next: 'Next', pickDay: 'Choose a day',
    read: 'Read the original', discuss: 'Discussion', why: 'Why it matters:',
    preprint: 'Preprint, not peer-reviewed', partial: 'Paywalled, summary of the free intro',
    originalFr: 'Original in French', originalEn: 'Original in English',
    kinds: { research: 'Research', news: 'News', investigation: 'Investigation', analysis: 'Analysis', opinion: 'Opinion', tutorial: 'Tutorial', essay: 'Essay' },
    loading: 'Loading…', empty: 'The first digest has not been published yet. It is generated once a day by a scheduled job — check back tomorrow.',
    error: 'Could not load this digest.', none: 'Nothing for this category today.',
    footnote: 'Summaries are written once a day by Claude from the original articles and can contain mistakes: always check the source. Politics comes only from independent, reader- or foundation-funded outlets.',
  },
  fr: {
    tagline: 'Chaque jour, trois lectures sur le code, trois articles scientifiques et trois sujets politiques de médias indépendants, expliqués en 200 mots environ.',
    coding: 'Code', science: 'Science', politics: 'Politique',
    surprise: 'Surprends-moi', surpriseFrom: (d) => `Au hasard, du ${d}`, close: 'Fermer',
    prev: 'Précédent', next: 'Suivant', pickDay: 'Choisir un jour',
    read: "Lire l'original", discuss: 'Discussion', why: 'Pourquoi c’est important :',
    preprint: 'Prépublication, non évaluée par les pairs', partial: 'Article payant, résumé de l’introduction gratuite',
    originalFr: 'Original en français', originalEn: 'Original en anglais',
    kinds: { research: 'Recherche', news: 'Actualité', investigation: 'Enquête', analysis: 'Analyse', opinion: 'Opinion', tutorial: 'Tutoriel', essay: 'Essai' },
    loading: 'Chargement…', empty: 'Le premier numéro n’a pas encore été publié. Il est généré une fois par jour par une tâche planifiée : revenez demain.',
    error: 'Impossible de charger ce numéro.', none: 'Rien dans cette catégorie aujourd’hui.',
    footnote: 'Les résumés sont rédigés une fois par jour par Claude à partir des articles originaux et peuvent contenir des erreurs : vérifiez toujours la source. La politique provient uniquement de médias indépendants, financés par leurs lecteurs ou une fondation.',
  },
};

const $ = (sel) => document.querySelector(sel);
const state = { lang: initialLang(), index: null, date: null, digest: null, cache: new Map() };

function initialLang() {
  try {
    const saved = localStorage.getItem('rk-lang');
    if (saved === 'en' || saved === 'fr') return saved;
  } catch {}
  return (navigator.language || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

const t = () => STRINGS[state.lang];

function formatDay(iso, style = 'long') {
  const d = new Date(`${iso}T12:00:00Z`);
  return new Intl.DateTimeFormat(state.lang === 'fr' ? 'fr-FR' : 'en-GB', {
    weekday: style === 'long' ? 'long' : undefined, day: 'numeric', month: style === 'long' ? 'long' : 'short', year: 'numeric', timeZone: 'UTC',
  }).format(d);
}

async function getJson(path) {
  if (state.cache.has(path)) return state.cache.get(path);
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  const data = await res.json();
  state.cache.set(path, data);
  return data;
}

const loadDigest = (date) => getJson(`data/digests/${date}.json`);

function safeHref(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null;
  } catch {
    return null;
  }
}

function renderStatic() {
  const s = t();
  document.documentElement.lang = state.lang;
  $('#tagline').textContent = s.tagline;
  // Labels can be hidden on narrow screens, so the buttons also carry them as accessible names.
  for (const [id, label] of [['#surprise', s.surprise], ['#prev', s.prev], ['#next', s.next]]) {
    $(`${id} .label`).textContent = label;
    $(id).setAttribute('aria-label', label);
  }
  $('#day-label').textContent = s.pickDay;
  $('#day').setAttribute('aria-label', s.pickDay);
  $('#footnote').textContent = s.footnote;
  for (const b of document.querySelectorAll('.lang button')) b.setAttribute('aria-pressed', String(b.dataset.lang === state.lang));
  renderDayPicker();
}

function renderDayPicker() {
  const select = $('#day');
  const dates = state.index?.dates || [];
  select.replaceChildren(...dates.map((d) => new Option(formatDay(d), d, false, d === state.date)));
  const i = dates.indexOf(state.date);
  // dates are newest first: "previous" goes further back in time.
  $('#prev').disabled = i < 0 || i >= dates.length - 1;
  $('#next').disabled = i <= 0;
  $('.days').hidden = dates.length === 0;
}

function buildCard(item) {
  const s = t();
  const text = item[state.lang] || item.en;
  const node = $('#card-tpl').content.firstElementChild.cloneNode(true);
  node.style.setProperty('--cat', `var(--${item.category})`);
  node.querySelector('.source').textContent = item.source;

  const badges = node.querySelector('.badges');
  const addBadge = (label, warn) => {
    const b = document.createElement('span');
    b.className = warn ? 'badge warn' : 'badge';
    b.textContent = label;
    badges.append(b);
  };
  if (item.kind && s.kinds[item.kind]) addBadge(s.kinds[item.kind]);
  if (item.badges?.preprint) addBadge(s.preprint, true);
  if (item.badges?.partial) addBadge(s.partial, true);
  if (item.sourceLang && item.sourceLang !== state.lang) addBadge(item.sourceLang === 'fr' ? s.originalFr : s.originalEn);

  const href = safeHref(item.url);
  const titleLink = node.querySelector('.title a');
  titleLink.textContent = text.title;
  if (href) titleLink.href = href;
  node.querySelector('.tldr').textContent = text.tldr;

  const summary = node.querySelector('.summary');
  for (const para of String(text.summary).split(/\n\s*\n/).filter((p) => p.trim())) {
    const p = document.createElement('p');
    p.textContent = para.trim();
    summary.append(p);
  }
  node.querySelector('.why strong').textContent = s.why;
  node.querySelector('.why span').textContent = text.why_it_matters;
  node.querySelector('.terms').replaceChildren(
    ...(text.key_terms || []).map((term) => Object.assign(document.createElement('li'), { textContent: term })),
  );

  const read = node.querySelector('.read');
  read.textContent = `${s.read} ↗`;
  if (href) read.href = href;
  const discussHref = item.discussionUrl && safeHref(item.discussionUrl);
  if (discussHref) {
    const d = node.querySelector('.discuss');
    d.hidden = false;
    d.href = discussHref;
    d.textContent = s.discuss;
  }
  if (item.publishedAt) node.querySelector('.date').textContent = formatDay(item.publishedAt.slice(0, 10), 'short');
  return node;
}

function renderDigest() {
  const s = t();
  const root = $('#digest');
  const digest = state.digest;
  if (!digest) return root.replaceChildren();
  root.replaceChildren(
    ...CATEGORY_ORDER.filter((c) => c in digest.categories).map((category) => {
      const section = document.createElement('section');
      section.className = 'category';
      section.dataset.cat = category;
      const h2 = document.createElement('h2');
      h2.textContent = s[category];
      const grid = document.createElement('div');
      grid.className = 'grid';
      const items = digest.categories[category];
      if (items.length) grid.append(...items.map(buildCard));
      else grid.append(Object.assign(document.createElement('p'), { className: 'status', textContent: s.none }));
      section.append(h2, grid);
      return section;
    }),
  );
}

function setStatus(msg) {
  $('#status').textContent = msg || '';
}

async function showDate(date, { push = true } = {}) {
  state.date = date;
  renderDayPicker();
  setStatus(t().loading);
  try {
    state.digest = await loadDigest(date);
    setStatus('');
  } catch {
    state.digest = null;
    setStatus(t().error);
  }
  renderDigest();
  if (push && location.hash !== `#${date}`) history.pushState(null, '', `#${date}`);
}

// Random item from a random day of the archive.
async function surprise() {
  const dates = state.index?.dates || [];
  if (!dates.length) return;
  for (let tries = 0; tries < 5; tries++) {
    const date = dates[Math.floor(Math.random() * dates.length)];
    let digest;
    try {
      digest = await loadDigest(date);
    } catch {
      continue;
    }
    const all = Object.values(digest.categories).flat();
    if (!all.length) continue;
    state.surprise = { date, item: all[Math.floor(Math.random() * all.length)] };
    renderSurprise();
    $('#surprise-box').scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
}

function renderSurprise() {
  const box = $('#surprise-box');
  if (!state.surprise) {
    box.hidden = true;
    return;
  }
  const head = document.createElement('div');
  head.className = 'surprise-head';
  const label = document.createElement('span');
  label.textContent = `🎲 ${t().surpriseFrom(formatDay(state.surprise.date))}`;
  const close = Object.assign(document.createElement('button'), { className: 'btn ghost', type: 'button', textContent: t().close });
  close.addEventListener('click', () => {
    state.surprise = null;
    renderSurprise();
  });
  head.append(label, close);
  box.replaceChildren(head, buildCard(state.surprise.item));
  box.hidden = false;
}

function setLang(lang) {
  state.lang = lang;
  try {
    localStorage.setItem('rk-lang', lang);
  } catch {}
  renderStatic();
  renderDigest();
  renderSurprise();
  if (!state.index?.dates?.length) setStatus(t().empty);
}

function dateFromHash() {
  const d = location.hash.slice(1);
  return state.index?.dates.includes(d) ? d : state.index?.latest;
}

async function init() {
  for (const b of document.querySelectorAll('.lang button')) b.addEventListener('click', () => setLang(b.dataset.lang));
  $('#surprise').addEventListener('click', surprise);
  $('#day').addEventListener('change', (e) => showDate(e.target.value));
  const step = (delta) => {
    const dates = state.index.dates;
    const next = dates[dates.indexOf(state.date) + delta];
    if (next) showDate(next);
  };
  $('#prev').addEventListener('click', () => step(1));
  $('#next').addEventListener('click', () => step(-1));
  window.addEventListener('popstate', () => {
    const d = dateFromHash();
    if (d && d !== state.date) showDate(d, { push: false });
  });

  renderStatic();
  try {
    state.index = await getJson('data/index.json');
  } catch {
    state.index = { latest: null, dates: [] };
  }
  if (!state.index.dates?.length) {
    $('#surprise').disabled = true;
    renderStatic();
    setStatus(t().empty);
    return;
  }
  await showDate(dateFromHash(), { push: false });
}

init();
