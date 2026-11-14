# Flamescope

**Live site:** https://enigmahacker.github.io/flamescope/

How fire behaves off Earth. An offline-built, cited dashboard that summarizes, ranks, and interprets NASA microgravity flame-spread experiments for crew fire safety on the Moon and Mars. No API key is ever shipped with the site. Every number on the dashboard is a field in `data/runs.csv` or `data/atmosphere_targets.csv`, and every claim cites a run ID (`FS-####`) or a passage ID (`C-####`).

## Run it

```bash
./pipeline.sh
```

```bash
python3 -m http.server 8765 --directory web
```

Then open http://localhost:8765. Opening `web/index.html` directly from disk also works, because the data is bundled in `web/data.js`.

## Pipeline

| Step | Script | Reads | Writes |
|---|---|---|---|
| 1. Fetch | `scripts/fetch.py` | `data/manifest.csv` | `raw/` (NTRS metadata and full text, PSI metadata and experimental tables) |
| 2. Extract | `scripts/extract.py` | `raw/PSI-*_Experimental table_*.csv` | `data/runs_psi.csv` |
| 3. Build | `scripts/build.py` | `data/runs_curated.csv`, `data/runs_psi.csv`, `raw/` | `data/runs.csv` and its split files, `data/chunks.jsonl`, `data/bm25_index.json` |
| 4. Embed | `scripts/embed.py` (uses `.venv`) | `config.yaml`, `data/chunks.jsonl` | `data/embeddings.npy`, `data/embeddings_meta.json` |
| 4b. SI answers | `scripts/groq_generate.py` (uses `.venv` and `GROQ_API_KEY`) | `config.yaml` `llm`, `data/llm_prompt.json`, runs, chunks | `data/llm_answers.json` (validated answers only reach the site) |
| 5. Evaluate | `scripts/eval.py [answers.json]` | `data/eval_set.json` | `data/eval_report.json` |
| 6. Export | `scripts/export.py` | all of `data/` | `web/data.js` |

Each step checks itself with asserts. For example: unit conversions must match the as-reported value, insight-card numbers must exist in the cited rows, and gold eval numbers must exist in the tables.

## Data contract

- **Granularity:** one row per run. Required fields are `source_url`, `o2_fraction_pct` (percent by volume), `total_pressure_kpa`, and `outcome`. A row missing any of these goes to `runs_excluded_missing_required.csv`; it is excluded, not ranked low.
- **Verification:** `verification_status` is `unverified` until a second person checks every number against the source, then `checked_against_source` or `conflict_found`. The ranked view (`runs_ranked_view.csv`) holds verified rows only. Conflict rows never enter it.
- **Units:** kPa, mm/s, m/s, and O2 in percent by volume. The value as reported in the source is kept next to each converted value.
- **Platforms:** `iss`, `drop_tower`, `parabolic_flight`, `shuttle`, `cygnus` (`cygnus` is pending team approval). Each platform is shown as its own group.
- **Hand-curated rows:** run rows extracted from paper text are in `data/runs_curated.csv` and were extracted with AI assistance. Rows from PSI tables are produced by script.
- **Copyright:** NTRS papers flagged `MAY_INCLUDE_COPYRIGHT_MATERIAL` are stored as short excerpts only. PSI datasets are CC0-1.0 and must be cited by DOI.

## Groq LLM (the "brain")

- **Offline:** put the key in your shell (`export GROQ_API_KEY=...`) or in a `.env` file in this folder. `.env` is gitignored. Then run `./pipeline.sh`. Groq answers every eval question from retrieved runs and passages only. An answer reaches the site only if every number in it matches a cited run or atmosphere target and every citation exists. Answers that fail validation are dropped.
- **Live (optional):** visitors can paste their own Groq key into the Ask tab. The key stays in that browser tab (session storage) and is sent only to `api.groq.com`. Live answers go through the same validation in the browser.
- The model and its settings are in `config.yaml` under `llm`. The prompt is in `data/llm_prompt.json` and is shared by the offline and live paths.

## Deploy

Every push to `main` triggers `.github/workflows/pages.yml`, which publishes `web/` to GitHub Pages. The workflow uses no secrets.

## Use of super intelligence (SI)

- **Code:** the scripts and the website were written with SI assistance (Claude by Anthropic, via Claude Code).
- **Data:** run rows extracted from paper text, OCR cleanup of excerpts, and insight cards were made with SI assistance and are labeled in the data (`extraction_method`, `ai_assisted`, the `notes` fields).
- **Answers:** answers tagged "SI" on the site come from a Groq-hosted LLM and carry `ai_generated: true` metadata.
- **Not SI:** the project idea, the verification rules, and the source data.

## Dashboard (`web/`)

- **Ask:** retrieval over passages and run rows using BM25 in the browser, with cited passages, matching runs, and curated answers drafted offline. When nothing supports an answer, it refuses.
- **Insights:** AI-drafted insight cards. Each is validated by `export.py` and labeled with the verification status of the runs it cites.
- **Rank:** runs ordered by closeness to the Moon or Mars target atmosphere (provisional criteria), plus an oxygen-vs-pressure scatter plot. Unverified runs appear only in a labeled preview.
- **Runs, Atmospheres, Sources, Evaluation:** the full tables, with flags, licenses, and eval scores.

## Known gaps

See `changelog.md`. In short:
- No run is verified yet.
- The PSI tables report no pressure.
- The Mars target has no citation.
- Embeddings are blocked until the Hugging Face account is granted access to `google/embeddinggemma-300m`.
- The contract's ranking criteria and schema files were not provided.
