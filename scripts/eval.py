"""Pipeline step 5: check the eval set and score retrieval (and, optionally, generated answers).

Usage: python3 -I scripts/eval.py [answers.json]
answers.json format: {"Q01": {"answer": "...", "citations": ["FS-0001", "C-0001"], "refused": false}, ...}
Writes data/eval_report.json.
"""
import csv, json, re, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build  # noqa: E402

DATA = build.DATA
TOP_K = 5  # mirror config.yaml retrieval.top_k
NUM = re.compile(r"(?<![\w.])-?\d+(?:\.\d+)?(?![\w.])")


def load():
    runs = {r["run_id"]: r for r in build.read_csv("runs.csv")}
    atm = {a["target_id"]: a for a in build.read_csv("atmosphere_targets.csv")}
    chunks = {json.loads(l)["chunk_id"]: json.loads(l) for l in open(DATA / "chunks.jsonl", encoding="utf-8")}
    qs = json.loads((DATA / "eval_set.json").read_text(encoding="utf-8"))["questions"]
    return runs, atm, chunks, qs


def allowed_numbers(cited, runs, atm):
    """Numbers an answer may contain: field values of cited runs, plus atmosphere targets."""
    vals = set()
    for rec in [runs[c] for c in cited if c in runs] + list(atm.values()):
        for v in rec.values():
            vals.update(NUM.findall(v or ""))
    return vals


def numbers_ok(text, cited, runs, atm):
    bad = [n for n in NUM.findall(text) if n not in allowed_numbers(cited, runs, atm)]
    return not bad, bad


def check_gold(runs, atm, chunks, qs):
    assert len([q for q in qs if q["type"] != "off_topic"]) == 20 and len([q for q in qs if q["type"] == "off_topic"]) == 5
    for q in qs:
        for r in q["gold_run_ids"]:
            assert r in runs, f"{q['id']}: unknown run {r}"
        for c in q["gold_chunk_ids"]:
            assert c in chunks, f"{q['id']}: unknown chunk {c}"
        if q["type"] == "answer":
            assert q["gold_run_ids"] or q["gold_chunk_ids"], f"{q['id']}: gold answer cites nothing"
        ok, bad = numbers_ok(" ".join(q["gold_numbers"]), q["gold_run_ids"], runs, atm)
        assert ok, f"{q['id']}: gold numbers {bad} not in runs.csv / atmosphere_targets.csv"


def score_retrieval(qs):
    index = json.loads((DATA / "bm25_index.json").read_text(encoding="utf-8"))
    rows, hits, scored, refusals, n_off = [], 0, 0, 0, 0
    for q in qs:
        got = build.bm25_search(index, q["question"], TOP_K)
        row = {"id": q["id"], "type": q["type"], "retrieved": got}
        if q["gold_chunk_ids"]:
            scored += 1
            row["hit"] = bool(set(got) & set(q["gold_chunk_ids"]))
            hits += row["hit"]
        if q["type"] == "off_topic":
            n_off += 1
            row["refused"] = not got
            refusals += row["refused"]
        rows.append(row)
    return {"retrieval_hit_rate": round(hits / scored, 3), "retrieval_scored": scored,
            "off_topic_refusal_rate": round(refusals / n_off, 3), "per_question": rows}


def score_answers(path, runs, atm, qs):
    ans = json.loads(Path(path).read_text(encoding="utf-8"))
    num_ok = cit_ok = ref_ok = n_num = n_cit = n_ref = 0
    for q in qs:
        a = ans.get(q["id"])
        if a is None:
            continue
        if q["type"] in ("off_topic", "unsupported"):
            n_ref += 1
            ref_ok += bool(a.get("refused"))
            continue
        n_num += 1
        num_ok += numbers_ok(a["answer"], a.get("citations", []), runs, atm)[0]
        n_cit += 1
        gold = set(q["gold_run_ids"]) | set(q["gold_chunk_ids"])
        cit_ok += bool(a.get("citations")) and set(a["citations"]) <= gold  # proxy: citations must be gold-supporting sources
    frac = lambda a, b: round(a / b, 3) if b else None
    return {"number_accuracy": frac(num_ok, n_num), "citation_accuracy": frac(cit_ok, n_cit), "refusal_accuracy": frac(ref_ok, n_ref)}


if __name__ == "__main__":
    runs, atm, chunks, qs = load()
    check_gold(runs, atm, chunks, qs)
    assert numbers_ok("0.92 mm/s at 101.325 kPa", ["FS-0001"], runs, atm)[0]
    assert not numbers_ok("0.95 mm/s", ["FS-0001"], runs, atm)[0], "number check must reject unknown numbers"
    report = score_retrieval(qs)
    if len(sys.argv) > 1:
        report["answers"] = score_answers(sys.argv[1], runs, atm, qs)
    (DATA / "eval_report.json").write_text(json.dumps(report, indent=1), encoding="utf-8")
    misses = [r["id"] for r in report["per_question"] if r.get("hit") is False or r.get("refused") is False]
    print(json.dumps({k: v for k, v in report.items() if k != "per_question"}, indent=1), "\nmisses:", misses)
