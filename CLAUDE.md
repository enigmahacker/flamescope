# CLAUDE.md: Flamescope project memory (read this first)

> **SI flag:** written by SI (Claude via Claude Code) for teammates' coding agents. The project idea is human (team).

## What we are building
Flamescope is team Berkelium's NASA Space Apps 2026 entry. The challenge: an SI-powered dashboard that summarizes, ranks, and interprets NASA microgravity fire experiments for crew fire safety on the Moon and Mars.
- **Team:** Berkelium (Aarush Koolwal, Vihaan Bafna, Aryamann Patne, Gadikota Sudeep Reddy)
- **Live site** (GitHub Pages): https://enigmahacker.github.io/flamescope/
- **Demo deck:** https://enigmahacker.github.io/flamescope/deck.html
- **Repository:** https://github.com/enigmahacker/flamescope (branch `main`; every push rebuilds `site/` and redeploys it)
- **Submission deadline:** Sunday 2026-11-15, 11:59 p.m. local time.

**Already built:**
- The data pipeline (`scripts/`, `pipeline.sh`).
- The frontend: a Next.js 16 + Tailwind 4 static export in `site/`. It is public, with no sign-in, because the submission guide requires links that need no password.
- The 7-slide demo deck (`site/public/deck.html`).

**Your job: build the backend** (section 5). Read [DOCUMENTATION.md](DOCUMENTATION.md) for the full system and the data contract (its section 6).

## 1. Non-negotiable rules (the data contract)
1. **One row per run, never per campaign.** `run_id` is `FS-####`.
2. **Required fields:** `source_url`, `o2_fraction_pct`, `total_pressure_kpa`, `outcome`. A run missing one is excluded, never ranked low.
3. **Never fill a field from memory or inference.** Leave it blank and name it in `data_quality_flag`.
4. **Units:** kPa, mm/s, m/s, O2 in percent by volume. Keep the as-reported value next to the converted one.
5. **Verification:** `verification_status` is `unverified` until a second person checks every number, then `checked_against_source` or `conflict_found`. Only verified rows enter the ranked view. Conflict rows never do.
6. **The number rule:** no number appears in any output unless it matches a field of a cited run in `data/runs.csv`, or `data/atmosphere_targets.csv`.
   - Use `scripts/eval.py::numbers_ok` (Python) or `checkAnswer` in `site/src/lib/engine.ts` (browser). Don't write a third check.
   - A cited passage counts for the runs it reports (its `run_ids`).
   - Mission and run names such as USML-1, STS-50, or FS-0001 are not read as numbers.
7. **Every claim cites** a run ID (`FS-####`), passage ID (`C-####`), or atmosphere ID (`ATM-*`).
8. **If the sources don't support an answer, say so** (`supported: false`).
9. **No document is ingested without a manifest entry** (`data/manifest.csv`).
10. **Copyright:** the NTRS papers 19950007798 and 19970020608 are flagged "may include copyright material". Publish only short excerpts, never their full text. Their `.txt` files are gitignored.
11. **Never commit or ship an API key or a plaintext password.** The Groq key lives in `.env` (gitignored) or a server environment variable.
12. **English only.**
13. **Label SI use:** every new file gets the one-line SI header used in `scripts/*.py`. Generated data carries `ai_generated` or `extraction_method` metadata. Add an entry to `changelog.md` for every change, with its reason.
14. **The project idea is always credited as human.** Everything SI touched is flagged (DOCUMENTATION.md section 2).
15. **No NASA logos or branding** anywhere in the site or the deck.
16. **The public site and deck must open with no password.** The Space Apps guide requires it. Any future sign-in protects only team tools (such as verification), never the judged pages.

## 2. Repository map
| Path | Role |
|---|---|
| `pipeline.sh` | Runs fetch → extract → build → embed → groq_generate → eval → export |
| `config.yaml` | Embedding model, chunking, top-k, hybrid weights, `llm.*` (Groq model and settings) |
| `scripts/build.py` | Validates the contract. Holds the BM25 helpers: `terms`, `bm25_scores`, `bm25_search`. |
| `scripts/eval.py` | `load()` and `numbers_ok()`, plus retrieval and answer scoring |
| `scripts/groq_generate.py` | Grounded prompt context (`context()`), Groq call (`groq()`), `validate()`, and run index (`run_index()`). **Reuse these in the backend.** |
| `scripts/embed.py` | EmbeddingGemma vectors plus `hybrid_search()`. Blocked until Hugging Face grants access. |
| `scripts/export.py` | Writes `site/src/data/bundle.json`, which the site imports at build time |
| `data/llm_prompt.json` | The one grounded-answer prompt, shared by every path |
| `site/src/lib/engine.ts` | Browser retrieval (BM25), the number rule (`checkAnswer`), and the live Groq call (`liveAnswer`) |
| `site/src/components/Ask.tsx` | The Ask section. `ask()` is the integration point for a backend. |
| `site/src/components/Dashboard.tsx` | Nav, hero, Evidence, Rank, Runs, About, footer |
| `site/public/deck.html` | The demo deck, a plain HTML file. |
| `site/AGENTS.md` | Next.js 16 has breaking changes. Read `site/node_modules/next/dist/docs/` before editing the site. |
| `DESIGN.md`, `design-tokens.json` | The design system (dark theme, Geist, one ember accent) |

**Environment:**
- Node 24 or newer for `site/` (`npm ci`, `npm run dev`, `npm run build`).
- Python 3.15 for the standard-library scripts.
- `.venv` on Python 3.14 for `sentence-transformers` and torch, which have no Python 3.15 wheels.

## 3. Shape of `bundle.json` (the frontend's only input)
`generated`, `runs[]`, `manifest[]`, `atmosphere[]`, `chunks[]`, `bm25{k1,b,n,avgdl,df,docs[]}`, `stopwords[]`, `required[]`, `cards[]`, `eval[]`, `eval_report`, `llm{meta,answers[]}|null`, `llm_prompt{system,user_template}`, `llm_model`.

## 4. Current state (2026-11-14)
- **Runs:** 275 in total.
  - 11 from paper text: shuttle SSCE thin and thick fuel, all `unverified`.
  - 264 from PSI tables: BASS, BASS-II, Saffire I, II, and III. All are excluded because the tables give no pressure.
- **Verified runs:** 10 (FS-0001 to FS-0006 and FS-0008 to FS-0011). A teammate (sudeepr695) checked all 11 paper-text runs against the two papers on 2026-11-15 (SI located the passages, the teammate confirmed), logged in `data/verification_log.csv`. FS-0007 is `conflict_found`: the paper has no flame data for a second STS-54 sample. The other 264 runs are excluded for missing pressure.
- **Passages:** 30 chunks, 11 manifest sources. The BASS-II summary report (NTRS 20210011385, PSI-25 dataset) was added on 2026-11-14.
- **Eval baseline (BM25):** hit rate 0.867, off-topic refusal 0.8.
- **Groq model:** `openai/gpt-oss-20b`, with `max_tokens` 1500 and `reasoning_effort` low. Groq retired the Llama models for free and developer tiers on 2026-08-16.
- **Live answers:** work with a visitor's own Groq key (the key stays in their browser tab).
- **Offline Groq answers:** not generated yet; no key on the build machine. `data/llm_answers.json` does not exist.
- **Embeddings:** blocked (Hugging Face 403 on `google/embeddinggemma-300m`).
- **Access:** the site and the deck are public. The earlier browser-only sign-in gate was removed before submission.
- **Open team decisions:**
  - Mars target citation (101 kPa / 21% O2 is uncited).
  - Moon target confirmation.
  - `cygnus` and `sounding_rocket` platform enum values.
  - The `question_answered` mapping rule.
  - Ranking criteria (currently provisional).
  - The remaining seed documents (8 are candidates).

## 5. Backend to build
The site is static, so it can't hold a key or accept writes. The backend adds a key-holding answer service, team sign-in for the verification tools, and a verification workflow.

**Suggested stack:** Python with FastAPI, so it imports `scripts/build.py`, `scripts/eval.py`, and `scripts/groq_generate.py` directly. Host it somewhere other than GitHub Pages (Render, Fly.io, Railway, or similar). CORS must allow only `https://enigmahacker.github.io` and `http://localhost:3000`.

**Endpoints:**
1. **`GET /api/health`** returns `{ok, data_generated, n_runs, n_chunks}`.
2. **`POST /api/login {username, password}`** returns a session token or cookie.
   - Store passwords server-side with a slow hash (argon2id or bcrypt), never in the repo.
   - Rate-limit attempts per IP and per username.
   - Protects team tools only (verification). The public dashboard and deck stay open.
3. **`GET /api/bundle`** returns the same JSON as `site/src/data/bundle.json`. Reuse `export.py` logic; don't fork it.
4. **`POST /api/ask {question}`** returns `{supported, answer, citations[], status, problems[], retrieved:{chunks[], runs[]}, model}`.
   - Retrieve with BM25 over chunks (`build.bm25_search`) and over runs (`groq_generate.run_index`). Add EmbeddingGemma hybrid search once access works.
   - Build context with `groq_generate.context`. Call Groq with `data/llm_prompt.json`, using `GROQ_API_KEY` from the server environment.
   - Validate with `groq_generate.validate`. Never return the text of a rejected answer.
   - Rate-limit per IP, for example 10 requests per minute and a daily cap, so strangers can't drain the key's quota.
   - Off-topic or unsupported questions return `supported: false`.
5. **`GET /api/runs?status=&platform=&q=`** returns the filtered runs.
6. **`POST /api/runs/{run_id}/verification {status, checker, field_checks{field: "ok"|"conflict"}, notes}`** records the second-person check.
   - Store it as an append-only log (SQLite or `data/verification_log.csv`), not by editing rows in place.
   - Then update `verification_status` through a merge step in `build.py`.
   - Reject a check by the same person who extracted the row.
   - Require a signed-in user.
7. **(Optional) `POST /api/eval`** runs `eval.py` against the live `/api/ask` and stores the scores.

**Frontend hook** (small change, in coordination with whoever owns `site/`):
- Read the backend URL from `process.env.NEXT_PUBLIC_FLAMESCOPE_API` at build time.
- In `Ask.tsx` `ask()`, when the URL is set, POST to `/api/ask` and render the result with `SiPanel` (tag "SI, live"). Keep the bring-your-own-key path as the fallback.

**Done when:**
- `/api/ask` passes the eval set: `python3 -I scripts/eval.py answers.json` reports number accuracy 1.0 and refusal accuracy ≥ 0.8.
- No key or plaintext password appears in the repo or in any response.
- Verification writes move rows into `runs_ranked_view.csv` only after a second-person check.
- `changelog.md` and `DOCUMENTATION.md` are updated, with SI flags.

## 6. Commands
```bash
./pipeline.sh                                   # rebuild all data (fetch, extract, build, embed, Groq, eval, export)
python3 -I scripts/build.py && python3 -I scripts/eval.py && python3 -I scripts/export.py   # quick data rebuild, no network
cd site && npm ci && npm run dev                # site at http://localhost:3000/flamescope/
cd site && npm run build                        # static export in site/out (CI does this on every push)
```
