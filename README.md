# Random Knowledge

A small website that, once a day, shows **3 coding reads, 3 science papers and 3 independent politics stories**, each explained in about 200 words in **English and French**.

A scheduled GitHub Action fetches recent articles, picks some at random, has Claude summarize them, commits the result to `data/`, and publishes the site on GitHub Pages. Everyone sees the same digest, so Claude runs once a day no matter how many people visit. See [PLAN.md](PLAN.md) for the design.

## One-time setup

1. **Default branch.** Scheduled workflows only run on the repository's default branch. Merge this work into the branch you want as default (e.g. `main`) and set it under *Settings → General → Default branch*.
2. **Claude token.** On your computer, run `claude setup-token` (needs a Claude Pro or Max plan) and copy the token. Add it under *Settings → Secrets and variables → Actions → New repository secret* as `CLAUDE_CODE_OAUTH_TOKEN`.
   - To pay per use instead of using your plan, add an `ANTHROPIC_API_KEY` secret (and remove the other one).
   - The model defaults to `sonnet`. To change it, add a repository **variable** `CLAUDE_MODEL` (e.g. `haiku`, `opus`).
3. **GitHub Pages.** *Settings → Pages → Build and deployment → Source: GitHub Actions*.

The first digest appears after the next daily run (05:23 UTC). Until then the site says the first digest has not been published yet.

> Using a Claude subscription to generate content for a public site may not match the intended personal use of consumer plans. Check Anthropic's terms; switching to an API key only changes the secret.

## How it works

```
GitHub Actions (cron, daily 05:23 UTC)
  pipeline/run.js
    1. fetch every source in pipeline/sources.js (a broken feed is logged and skipped)
    2. keep recent items not already shown in the last 60 days
    3. random pick, seeded by the date, interleaved so every source gets a fair chance
    4. download the article text where the feed only has a teaser (Hacker News, Guardian, …)
    5. Claude Code (headless, no tools) writes the EN + FR summary as validated JSON;
       a summary that fails validation is retried once, then replaced by a spare item
    6. write data/digests/YYYY-MM-DD.json and data/index.json
  commit data/ → build _site (site/ + data/) → deploy to GitHub Pages
```

| Path | What |
|---|---|
| `pipeline/sources.js` | All sources, items per category, length limits. Edit this to add or remove a source. |
| `pipeline/fetchers/` | RSS/Atom, Hacker News, arXiv, bioRxiv/medRxiv, Europe PMC |
| `pipeline/summarize.js` | Prompt, JSON schema, validation, Claude CLI call |
| `pipeline/run.js` | Orchestration |
| `site/` | Static front end (no framework, no build step) |
| `data/` | Published digests (written by the workflow only) |

Each digest also records which sources failed and which summaries were rejected (`report` in the JSON), so a dead feed is easy to spot.

## Sources

- **Coding:** GitHub Blog, Martin Fowler, Julia Evans, Hacker News top stories (score ≥ 150).
- **Science:** arXiv, bioRxiv, medRxiv (preprints, badged "not peer-reviewed"), Europe PMC open-access papers, PLOS ONE, PLOS Biology, Nature, Science.
- **Politics (independent outlets only):** ProPublica, Mediapart, Bellingcat, The Conversation (global + France), Le Monde diplomatique, Reporterre, The Guardian. Mediapart and Le Monde diplomatique are paywalled: only their free intro is summarized and the card says so.

## Local development

```bash
npm ci
npm test                  # parsers, selection, validation, end-to-end with stubs
npm run digest            # real run: needs network access and a logged-in `claude` CLI
npm run preview           # assemble _site and serve it locally
```
