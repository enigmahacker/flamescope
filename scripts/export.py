"""SI-generated code: written by Claude (Anthropic) via Claude Code under team direction. Project idea: human (team).

Pipeline step 6: validate insight cards and bundle everything the static dashboard needs.

Usage: python3 -I scripts/export.py   -> web/data.js (window.DATA = {...}; loads over file:// with no server)
"""
import json, re, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build, eval as ev  # noqa: E402

ROOT, DATA = build.ROOT, build.DATA


def card_status(cites, runs):
    st = {runs[c]["verification_status"] for c in cites if c in runs}
    if not st:
        return "source_text_only"  # cites passages, no run numbers to verify
    if "conflict_found" in st:
        return "conflict_found"
    return "verified" if st == {"checked_against_source"} else "unverified"


def main():
    runs, atm, chunks, _ = ev.load()
    cards = json.loads((DATA / "insight_cards.json").read_text(encoding="utf-8"))["cards"]
    for c in cards:
        missing = [x for x in c["citations"] if x not in runs and x not in chunks]
        assert not missing, f"{c['id']}: unknown citations {missing}"
        ok, bad = ev.numbers_ok(c["claim"] + " " + c["implication"], c["citations"], runs, atm)
        assert ok, f"{c['id']}: numbers {bad} not in cited runs.csv rows or atmosphere_targets.csv"
        c["status"] = card_status(c["citations"], runs)
    llm = None
    if (DATA / "llm_answers.json").exists():
        llm = json.loads((DATA / "llm_answers.json").read_text(encoding="utf-8"))
        for a in llm["answers"]:  # re-check against the current tables; tables may have changed since generation
            ok = all(c in runs or c in chunks or c in atm for c in a["citations"]) and ev.numbers_ok(a["answer"], a["citations"], runs, atm)[0]
            if a["status"] == "validated" and not ok:
                a["status"] = "rejected"
        llm["answers"] = [a for a in llm["answers"] if a["status"] in ("validated", "refused")]
    cfg = (ROOT / "config.yaml").read_text(encoding="utf-8")
    model = re.search(r"^llm:.*?^\s+model:\s*(\S+)", cfg, re.S | re.M)[1]
    report = json.loads((DATA / "eval_report.json").read_text(encoding="utf-8")) if (DATA / "eval_report.json").exists() else None
    bundle = {
        "generated": build.read_csv("manifest.csv")[0]["date_retrieved"],
        "runs": list(runs.values()),
        "manifest": build.read_csv("manifest.csv"),
        "atmosphere": list(atm.values()),
        "chunks": list(chunks.values()),
        "bm25": json.loads((DATA / "bm25_index.json").read_text(encoding="utf-8")),
        "stopwords": sorted(build.STOP),
        "required": build.REQUIRED,
        "cards": cards,
        "eval": json.loads((DATA / "eval_set.json").read_text(encoding="utf-8"))["questions"],
        "eval_report": report,
        "llm": llm,
        "llm_prompt": json.loads((DATA / "llm_prompt.json").read_text(encoding="utf-8")),
        "llm_model": model,
    }
    (ROOT / "web").mkdir(exist_ok=True)
    (ROOT / "web/data.js").write_text("window.DATA = " + json.dumps(bundle, ensure_ascii=False) + ";\n", encoding="utf-8")
    print(f"web/data.js: {len(runs)} runs, {len(chunks)} chunks, {len(cards)} cards ({[c['status'] for c in cards]})")


if __name__ == "__main__":
    main()
