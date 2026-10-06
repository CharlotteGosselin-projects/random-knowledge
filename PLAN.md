# Plan: Random Knowledge

Agreed design, October 2026.

## Goal
A public website showing, every day, random recent knowledge in three categories, summarized by Claude once a day for everyone.

## Decisions
| Topic | Decision |
|---|---|
| Categories | Coding, science, politics, **3 items each** per day |
| Coding sources | GitHub Blog, Martin Fowler, Julia Evans, Hacker News (Medium dropped: paywalls, uneven quality) |
| Science sources | arXiv, bioRxiv, medRxiv, Europe PMC, PLOS ONE/Biology, Nature, Science. Preprints are badged and described as not peer-reviewed. OpenAlex skipped (paid API since Feb 2026). |
| Politics sources | Independent only (no billionaire, conglomerate or state owner; reader/foundation funded): ProPublica, Mediapart, Bellingcat, The Conversation, Le Monde diplomatique, Reporterre, The Guardian (Scott Trust). Kyiv Independent and Meduza dropped by choice; OCCRP excluded (largest funder is the US State Department). |
| Summaries | ~200 words + one-line takeaway + why it matters + key terms, written natively in **English and French**. Paywalled intros get a shorter summary rather than padding. |
| AI | Claude Code CLI in GitHub Actions, authenticated with the owner's Claude plan (`CLAUDE_CODE_OAUTH_TOKEN`); API key supported as a drop-in alternative. |
| Schedule | Once a day via GitHub Actions cron only. No manual trigger, no button on the site. |
| Hosting | GitHub Pages, static site, digests stored as JSON in the repo. |
| Site | FR/EN switch (defaults to browser language), archive by date, "Surprise me" (random item from the archive, no AI call), light/dark, mobile. |
| Copyright | Only summaries and links are published, never full article text. |

## Safeguards
- A failing source never stops the run; failures are recorded in the digest's `report`.
- The pick is seeded by the date, and links shown in the last 60 days are never picked again.
- Summaries are validated (both languages, word count, fields) and retried once; spares replace items that still fail.
- Article text is passed to Claude as data with tools disabled; the site renders all text with `textContent`.
- If nothing could be summarized, the run fails and the previous digest stays online.
