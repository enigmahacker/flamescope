#!/usr/bin/env bash
# SI-generated code: written by Claude (Anthropic) via Claude Code under team direction. Project idea: human (team).
# Full offline pipeline: fetch -> extract -> build (validate, split, chunk, BM25) -> embed -> eval -> export dashboard.
set -euo pipefail
cd "$(dirname "$0")"

python3 -I scripts/fetch.py        # 1. NTRS + PSI sources listed in data/manifest.csv -> raw/
python3 -I scripts/extract.py      # 2. PSI experimental tables -> data/runs_psi.csv
python3 -I scripts/build.py        # 3. merge with data/runs_curated.csv, validate, split, chunk, BM25 index
if [ -x .venv/bin/python ]; then   # 4. embeddings (needs Hugging Face access to the gated model)
  .venv/bin/python scripts/embed.py || echo "embed step failed; dashboard still builds on BM25" >&2
fi
if [ -x .venv/bin/python ] && { [ -n "${GROQ_API_KEY:-}" ] || grep -qs '^GROQ_API_KEY=' .env; }; then
  .venv/bin/python scripts/groq_generate.py   # 4b. offline Groq answers, validated (key stays on this machine)
fi
if [ $# -eq 0 ] && [ -f data/llm_answers_for_eval.json ]; then set -- data/llm_answers_for_eval.json; fi
python3 -I scripts/eval.py "$@"    # 5. eval set checks + retrieval scores (+ LLM answer scores when present)
python3 -I scripts/export.py       # 6. validated insight cards + web/data.js
echo "Open web/index.html, or run: python3 -m http.server 8765 --directory web"
