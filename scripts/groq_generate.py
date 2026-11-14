"""SI-generated code: written by Claude (Anthropic) via Claude Code under team direction. Project idea: human (team).

Pipeline step 4b: offline LLM answers with Groq, grounded in retrieved runs and passages, then validated.

Usage: .venv/bin/python scripts/groq_generate.py
Key: GROQ_API_KEY from the environment or a local .env file (gitignored). The key never leaves this machine
and is never written to any output. Writes data/llm_answers.json (AI-generated, labelled as such).
Each answer is kept only as 'validated' when every number matches a cited run / atmosphere field and every
citation exists; otherwise it is stored with status 'rejected' and the dashboard does not show it.
"""
import json, os, re, sys, time, urllib.error, urllib.request
from datetime import datetime, timezone
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build, eval as ev  # noqa: E402

ROOT, DATA = build.ROOT, build.DATA
CFG = yaml.safe_load((ROOT / "config.yaml").read_text(encoding="utf-8"))["llm"]
PROMPT = json.loads((DATA / "llm_prompt.json").read_text(encoding="utf-8"))
RUN_FIELDS = ["experiment", "mission", "sample", "platform", "fuel", "o2_fraction_pct", "total_pressure_kpa",
              "flow_condition", "flow_velocity_m_s", "spread_rate_mm_s", "outcome", "verification_status"]
ID = re.compile(r"\b(?:FS|C|D)-\d{4}\b|\bATM-[A-Z]+\b")


def api_key():
    name = CFG["api_key_env"]
    if os.environ.get(name):
        return os.environ[name]
    env = ROOT / ".env"
    if env.exists():
        for line in env.read_text(encoding="utf-8").splitlines():
            k, _, v = line.partition("=")
            if k.strip() == name and v.strip():
                return v.strip().strip('"').strip("'")
    sys.exit(f"Set {name} in your shell or in {env} (gitignored). Nothing was generated.")


def groq(path, key, body=None):
    req = urllib.request.Request(CFG["base_url"] + path, data=json.dumps(body).encode() if body else None,
                                 headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json",
                                          "User-Agent": "flamescope-pipeline/0.1"})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < 3:  # rate limited: back off and retry
                time.sleep(2 ** attempt * 3)
                continue
            raise SystemExit(f"Groq API error {e.code}: {e.read().decode(errors='replace')[:300]}")


def run_index(runs):
    """BM25 over run records, same scheme as the browser so offline and live retrieval agree."""
    docs = []
    for r in runs.values():
        text = " ".join(r[k] for k in ("run_id", "experiment", "mission", "sample", "fuel", "fuel_geometry",
                                        "platform", "flow_condition", "outcome", "outcome_notes"))
        tf = {}
        for t in build.terms(text):
            tf[t] = tf.get(t, 0) + 1
        docs.append({"chunk_id": r["run_id"], "len": sum(tf.values()), "tf": tf})
    df = {}
    for d in docs:
        for t in d["tf"]:
            df[t] = df.get(t, 0) + 1
    return {"k1": build.K1, "b": build.B, "n": len(docs), "avgdl": sum(d["len"] for d in docs) / len(docs), "df": df, "docs": docs}


def context(q, runs, chunks, atm, cidx, ridx):
    lines = []
    for cid in build.bm25_search(cidx, q, CFG["context_chunks"]):
        c = chunks[cid]
        lines.append(f"[{cid}] passage ({c['section']}): {c['text']}")
    for rid in build.bm25_search(ridx, q, CFG["context_runs"]):
        r = runs[rid]
        lines.append(f"[{rid}] run: " + "; ".join(f"{k}={r[k]}" for k in RUN_FIELDS if r[k]))
    for a in atm.values():
        lines.append(f"[{a['target_id']}] atmosphere target: {a['scenario']}; total_pressure_kpa={a['total_pressure_kpa']}; "
                     f"o2_fraction_pct={a['o2_fraction_pct']}; status={a['status']}")
    return "\n".join(lines)


def validate(ans, runs, chunks, atm):
    """Return (status, problems). Refusals are valid; supported answers need real citations and table numbers."""
    if not ans.get("supported"):
        return "refused", []
    cites = list(dict.fromkeys((ans.get("citations") or []) + ID.findall(ans.get("answer", ""))))
    ans["citations"] = cites
    problems = [f"unknown citation {c}" for c in cites if c not in runs and c not in chunks and c not in atm]
    if not cites:
        problems.append("no citations")
    ok, bad = ev.numbers_ok(ID.sub("", ans.get("answer", "")), cites, runs, atm)
    if not ok:
        problems.append(f"numbers not in cited rows: {bad}")
    return ("validated" if not problems else "rejected"), problems


def main():
    key = api_key()
    models = {m["id"] for m in groq("/models", key)["data"]}
    assert CFG["model"] in models, f"model {CFG['model']} not offered by Groq; available: {sorted(models)}"
    runs, atm, chunks, qs = ev.load()
    cidx = json.loads((DATA / "bm25_index.json").read_text(encoding="utf-8"))
    ridx = run_index(runs)
    out = []
    for q in qs:
        msgs = [{"role": "system", "content": PROMPT["system"]},
                {"role": "user", "content": PROMPT["user_template"].format(question=q["question"],
                                                                            context=context(q["question"], runs, chunks, atm, cidx, ridx))}]
        resp = groq("/chat/completions", key, {"model": CFG["model"], "messages": msgs, "temperature": CFG["temperature"],
                                               "max_tokens": CFG["max_tokens"], "reasoning_effort": CFG.get("reasoning_effort", "low"),
                                               "response_format": {"type": "json_object"}})
        try:
            ans = json.loads(resp["choices"][0]["message"]["content"])
        except (KeyError, json.JSONDecodeError):
            ans = {"supported": False, "answer": "", "citations": []}
        status, problems = validate(ans, runs, chunks, atm)
        out.append({"id": q["id"], "question": q["question"], "answer": ans.get("answer", ""), "citations": ans.get("citations", []),
                    "refused": status == "refused", "status": status, "problems": problems})
        print(q["id"], status, problems or "")
    meta = {"ai_generated": True, "generator": f"Groq {CFG['model']}", "temperature": CFG["temperature"],
            "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "note": "SI-generated text (large language model). Grounded in Flamescope runs and passages; validated by scripts/groq_generate.py."}
    (DATA / "llm_answers.json").write_text(json.dumps({"meta": meta, "answers": out}, indent=1), encoding="utf-8")
    # eval.py answer format
    (DATA / "llm_answers_for_eval.json").write_text(json.dumps({a["id"]: a for a in out}, indent=1), encoding="utf-8")


if __name__ == "__main__":
    runs, atm, chunks, _ = ev.load()
    assert validate({"supported": True, "answer": "Spread was 0.92 mm/s [FS-0001].", "citations": []}, runs, chunks, atm)[0] == "validated"
    assert validate({"supported": True, "answer": "Spread was 9.99 mm/s [FS-0001].", "citations": []}, runs, chunks, atm)[0] == "rejected"
    assert validate({"supported": True, "answer": "Fine.", "citations": ["FS-9999"]}, runs, chunks, atm)[0] == "rejected"
    main()
