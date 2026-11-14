# Flamescope

> **SI flag:** this README was drafted by SI (Claude by Anthropic, via Claude Code) under the team's direction. The project idea is human.

**Live site:** https://enigmahacker.github.io/flamescope/  
**Demo deck:** https://enigmahacker.github.io/flamescope/deck.html  
**Team:** Berkelium (Aarush Koolwal, Vihaan Bafna, Aryamann Patne, Gadikota Sudeep Reddy)  
**Challenge:** NASA Space Apps 2026

How fire behaves off Earth. Flamescope is a cited dashboard that summarizes, ranks, and interprets NASA microgravity flame-spread experiments for crew fire safety on the Moon and Mars. Every number on the dashboard is a field in `data/runs.csv` or `data/atmosphere_targets.csv`, and every claim cites a run ID (`FS-####`) or a passage ID (`C-####`). No API key is ever shipped with the site.

The site and the deck open after a team sign-in page. Ask the team lead for the credentials.

## Run it

Rebuild the data:

```bash
./pipeline.sh
```

Run the site locally:

```bash
cd site && npm ci && npm run dev
```

Then open http://localhost:3000/flamescope/. For a production build, run `npm run build` in `site/`; the static files land in `site/out`.

## Pipeline

| Step | Script | Reads | Writes |
|---|---|---|---|
| 1. Fetch | `scripts/fetch.py` | `data/manifest.csv` | `raw/` (NTRS metadata and full text, PSI metadata and experimental tables) |
| 2. Extract | `scripts/extract.py` | `raw/PSI-*_Experimental table_*.csv` | `data/runs_psi.csv` |
| 3. Build | `scripts/build.py` | `data/runs_curated.csv`, `data/runs_psi.csv`, `raw/` | `data/runs.csv` and its split files, `data/chunks.jsonl`, `data/bm25_index.json` |
| 4. Embed | `scripts/embed.py` (uses `.venv`) | `config.yaml`, `data/chunks.jsonl` | `data/embeddings.npy`, `data/embeddings_meta.json` |
| 4b. SI answers | `scripts/groq_generate.py` (uses `.venv` and `GROQ_API_KEY`) | `config.yaml` `llm`, `data/llm_prompt.json`, runs, chunks | `data/llm_answers.json` (validated answers only reach the site) |
| 5. Evaluate | `scripts/eval.py [answers.json]` | `data/eval_set.json` | `data/eval_report.json` |
| 6. Export | `scripts/export.py` | all of `data/` | `site/src/data/bundle.json` |
| 7. Site build | `npm run build` in `site/` | `site/src/data/bundle.json` | `site/out` (published to GitHub Pages) |

Each step checks itself with asserts. For example: unit conversions must match the as-reported value, insight-card numbers must exist in the cited rows, and gold eval numbers must exist in the tables.

## Data contract

- **Granularity:** one row per run. Required fields are `source_url`, `o2_fraction_pct` (percent by volume), `total_pressure_kpa`, and `outcome`. A row missing any of these goes to `runs_excluded_missing_required.csv`; it is excluded, not ranked low.
- **Verification:** `verification_status` is `unverified` until a second person checks every number against the source, then `checked_against_source` or `conflict_found`. The ranked view (`runs_ranked_view.csv`) holds verified rows only. Conflict rows never enter it.
- **Units:** kPa, mm/s, m/s, and O2 in percent by volume. The value as reported in the source is kept next to each converted value.
- **Platforms:** `iss`, `drop_tower`, `parabolic_flight`, `shuttle`, `cygnus` (`cygnus` is pending team approval). Each platform is shown as its own group.
- **Hand-curated rows:** run rows extracted from paper text are in `data/runs_curated.csv` and were extracted with SI assistance. Rows from PSI tables are produced by script.
- **Copyright:** NTRS papers flagged `MAY_INCLUDE_COPYRIGHT_MATERIAL` are stored as short excerpts only. PSI datasets are CC0-1.0 and must be cited by DOI.

## The site (`site/`, Next.js + Tailwind)

One dark page with a floating nav and five sections:
- **Ask:** search over passages and run rows in the browser (BM25), with cited passages, matching runs, curated answers, and SI answers. When nothing supports an answer, it refuses.
- **Evidence:** every run with a known oxygen level and pressure plotted against the Moon and Mars cabin targets, next to SI-drafted insight cards. Each card is validated by `export.py` and labeled with the verification status of the runs it cites.
- **Rank:** runs ordered by closeness to the Moon or Mars target atmosphere (provisional criteria). Unverified runs appear only in a labeled preview.
- **Runs:** every run, grouped by platform, with filters. Open a run for its full record and flags.
- **About:** how it works, where SI was used, every NASA source with its license, references, evaluation scores, the demo link, and known limits.

**Sign-in:** a page in front of the dashboard and the deck.
- The username and password are stored only as salted PBKDF2-SHA-256 hashes in `site/src/data/auth.json`.
- To change them, run `node site/scripts/hash-credentials.mjs <user> <pass>`, then commit and push.
- It is a gate, not access control. The check runs in the browser and the published files are public. Real sign-in belongs in the backend (see `CLAUDE.md`).
- The Space Apps submission guide asks for links that need no password. If the gate stays, give judges the credentials in the project description.

## Groq LLM (the "brain")

- **Model:** `openai/gpt-oss-20b`, set in `config.yaml` under `llm`. The prompt is in `data/llm_prompt.json` and is shared by the offline and live paths.
- **Offline:** put the key in your shell (`export GROQ_API_KEY=...`) or in a `.env` file in this folder. `.env` is gitignored. Then run `./pipeline.sh`. Groq answers every eval question from retrieved runs and passages only. An answer reaches the site only if every number in it matches a cited run or atmosphere target and every citation exists. Answers that fail validation are dropped.
- **Live (optional):** visitors can paste their own Groq key into the Ask section. The key stays in that browser tab (session storage) and is sent only to `api.groq.com`. Live answers go through the same validation in the browser.

## Deploy

Every push to `main` triggers `.github/workflows/pages.yml`, which builds `site/` (`npm ci && npm run build`) and publishes `site/out` to GitHub Pages. The workflow uses no secrets.

## Use of super intelligence (SI)

- **Human (not SI):** the project idea and approach, and the team's decisions. The source data comes from NASA.
- **Code and design:** the scripts, the website, the sign-in page, the design system, and the demo deck were generated by SI (Claude by Anthropic, via Claude Code) under the team's direction. Every code file says so in its first line.
- **Data:** run rows extracted from paper text, OCR cleanup of excerpts, and insight cards were made with SI assistance and are labeled in the data (`extraction_method`, `ai_assisted`, the `notes` fields).
- **Answers:** answers tagged "SI" on the site come from a Groq-hosted LLM and carry `ai_generated: true` metadata.
- **No SI-generated images, audio, or video.** The flame animation is drawn by code and labeled as an illustration.

## More documentation

| File | What it covers |
|---|---|
| [DOCUMENTATION.md](DOCUMENTATION.md) | The full system, the data contract, and the per-artifact SI disclosure |
| [SOURCES.md](SOURCES.md) | Every NASA source, API, model, library, and font, with URLs |
| [DESIGN.md](DESIGN.md) | The design system |
| [CLAUDE.md](CLAUDE.md) | Project memory and the backend spec for teammates' coding agents |
| [SUBMISSION.md](SUBMISSION.md) | Draft text for the Space Apps project page |
| [changelog.md](changelog.md) | Every change and its reason |

## Known gaps

- No run is verified yet, so the ranked view is empty.
- The PSI tables report no pressure, so those runs are excluded from ranking.
- The Mars target has no citation.
- Offline Groq answers are not generated yet; no key is set on the build machine.
- Embeddings are blocked until the Hugging Face account is granted access to `google/embeddinggemma-300m`.
- The contract's ranking criteria and schema files were not provided, so the ranking is provisional.
- The sign-in gate is not real security, and it conflicts with the guide's no-password rule.
