"""SI-generated code: written by Claude (Anthropic) via Claude Code under team direction. Project idea: human (team).

Validate runs.csv, split by verification status, build chunks.jsonl.

Usage: python3 -I scripts/build.py   (run from project root)
Stdlib only. Fails loudly (assert) on contract violations.
"""
import csv, json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA, RAW = ROOT / "data", ROOT / "raw"

PLATFORMS = {"iss", "drop_tower", "parabolic_flight", "shuttle", "cygnus"}  # shuttle, cygnus added 2026-11-14 (cygnus pending team approval)
OUTCOMES = {"", "spread", "no_spread"}
STATUSES = {"unverified", "checked_against_source", "conflict_found"}
QUESTIONS = {"", "transport", "habitat", "long-duration"}
REQUIRED = ["source_url", "o2_fraction_pct", "total_pressure_kpa", "outcome"]
ATM_KPA = 101.325
CHUNK_MAX, OVERLAP = 600, 50  # mirror config.yaml


def read_csv(name):
    with open(DATA / name, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def write_csv(name, rows, fields):
    with open(DATA / name, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(rows)


def check_runs(runs, manifest):
    docs = {d["doc_id"] for d in manifest}
    ids = [r["run_id"] for r in runs]
    assert len(ids) == len(set(ids)), "duplicate run_id"
    for r in runs:
        rid = r["run_id"]
        assert re.fullmatch(r"FS-\d{4}", rid), rid
        assert r["doc_id"] in docs, f"{rid}: doc not in manifest"
        assert r["verification_status"] in STATUSES, rid
        assert r["platform"] in PLATFORMS, f"{rid}: platform {r['platform']!r}"
        assert r["question_answered"] in QUESTIONS, rid
        assert r["outcome"] in OUTCOMES, f"{rid}: outcome {r['outcome']!r}"
        if r["o2_fraction_pct"]:
            assert 0 < float(r["o2_fraction_pct"]) <= 100, rid
            assert r["o2_units"] == "percent_by_volume", rid
        # unit conversions must match the as-reported string
        m = re.match(r"([\d.]+) atm", r["pressure_as_reported"])
        if m and r["total_pressure_kpa"]:
            assert abs(float(m[1]) * ATM_KPA - float(r["total_pressure_kpa"])) < 0.01, rid
        m = re.match(r"([\d.]+) cm/s", r["spread_rate_as_reported"])
        if m:
            assert abs(float(m[1]) * 10 - float(r["spread_rate_mm_s"])) < 1e-6, rid
        if not r["question_answered"]:
            assert "question_answered" in r["data_quality_flag"], f"{rid}: blank field without flag"


def split_runs(runs):
    fields = list(runs[0].keys())
    complete = lambda r: all(r[k].strip() for k in REQUIRED)
    groups = {
        "runs_verified.csv": [r for r in runs if r["verification_status"] == "checked_against_source" and complete(r)],
        "runs_unverified.csv": [r for r in runs if r["verification_status"] == "unverified" and complete(r)],
        "runs_conflict.csv": [r for r in runs if r["verification_status"] == "conflict_found"],
        "runs_excluded_missing_required.csv": [r for r in runs if not complete(r)],
    }
    for name, rows in groups.items():
        write_csv(name, rows, fields)
    # ranked view = verified only; conflict_found and incomplete rows never enter it
    write_csv("runs_ranked_view.csv", groups["runs_verified.csv"], fields)
    return {k: len(v) for k, v in groups.items()}


def ntok(text):
    # shortcut: whitespace words x 1.3 approximates subword tokens; swap for the embedding model's tokenizer once confirmed
    return int(len(text.split()) * 1.3)


def window(text):
    """Split text over CHUNK_MAX tokens into overlapping word windows."""
    if ntok(text) <= CHUNK_MAX:
        return [text]
    words = text.split()
    size, step = int(CHUNK_MAX / 1.3), int((CHUNK_MAX - OVERLAP) / 1.3)
    return [" ".join(words[i:i + size]) for i in range(0, len(words) - (size - step), step)]


# Short verbatim excerpts only: D-0001 and D-0002 carry NTRS flag MAY_INCLUDE_COPYRIGHT_MATERIAL.
# OCR text was cleaned by hand (AI-assisted) against the NTRS text; page = printed page number.
EXCERPTS = [
    ("D-0001", "abstract", "p.83", ["FS-0001"],
     "An experiment was conducted aboard STS-50/USML-1 in the Solid Surface Combustion Experiment (SSCE) hardware for flame spread over a thin cellulosic fuel in a quiescent oxidizer of 35% oxygen / 65% nitrogen at 1.0 atm. pressure in microgravity."),
    ("D-0001", "methods", "p.84", ["FS-0001"],
     "The test sample, 11.0 cm long by 3.0 cm wide, was made from Whatman #1 filter paper, 0.0825 mm half-thickness."),
    ("D-0001", "results", "p.88", ["FS-0001", "FS-0002", "FS-0003", "FS-0004", "FS-0005"],
     "The nominal leading-edge spread rate determined from the film for the 35% oxygen/1.0 atm experiment here is 0.092 cm/s, while at 1.5 atm it is 0.150 cm/s, and at 50% oxygen, for 1.0, 1.5, and 2.0 atm it is 0.358, 0.454, and 0.547 cm/s, respectively."),
    ("D-0001", "conclusions", "p.91", ["FS-0001"],
     "The spread rate of the leading edge becomes steady almost immediately after ignition and increases with increasing pressure and oxygen content."),
    ("D-0002", "methods", "p.381-382", ["FS-0006", "FS-0007", "FS-0008", "FS-0009", "FS-0010", "FS-0011"],
     "Three Shuttle missions were conducted with quiescent test atmospheres consisting of mixtures of O2/N2 at 70% O2/1 atm pressure (STS-54), 50% O2/1 atm (STS-63), and 50% O2/2 atm (STS-64). In each flight two PMMA samples, 25.4 mm long x 6.35 mm wide x 3.18 mm thick were imbedded in an aluminum structure."),
    ("D-0002", "methods", "p.382", ["FS-0008", "FS-0009", "FS-0010", "FS-0011"],
     "In STS-64, the first sample quench time was computed using a higher threshold temperature, and the second sample was allowed to burn until the cine film was consumed. In STS-63, both samples were allowed to burn until the cine film was consumed, but the cameras were started 60 seconds after ignition in the second sample."),
    ("D-0002", "conclusions", "p.384", ["FS-0006", "FS-0007", "FS-0008", "FS-0009", "FS-0010", "FS-0011"],
     "Experiments for flame spread over flat surfaces of thick fuels in microgravity show that the flame spread rate slowly decreases with time."),
]

# Public-use / CC0 sources: full abstract or PSI description text is stored.
NTRS_ABSTRACTS = {"D-0003": "19990054039", "D-0004": "20130013505"}
PSI = {"D-0005": "PSI-25", "D-0006": "PSI-26", "D-0007": "PSI-98", "D-0008": "PSI-99", "D-0009": "PSI-100", "D-0010": "PSI-62"}
PSI_FIELDS = ["objective", "approach", "hypothesis"]


def build_chunks(manifest):
    meta = {d["doc_id"]: d for d in manifest}
    raw = [(d, s, p, r, t, True) for d, s, p, r, t in EXCERPTS]  # (doc, section, location, run_ids, text, ai_assisted)
    for doc, nid in NTRS_ABSTRACTS.items():
        j = json.loads((RAW / f"{nid}.json").read_text(encoding="utf-8"))
        raw.append((doc, "abstract", "NTRS abstract", [], j["abstract"].strip(), False))
    for doc, acc in PSI.items():
        j = json.loads((RAW / f"{acc}.json").read_text(encoding="utf-8"))
        for fld in PSI_FIELDS:
            if (j.get(fld) or "").strip():
                raw.append((doc, fld, f"PSI {fld} field", [], j[fld].strip(), False))
    out = []
    for doc, sec, loc, rids, text, ai in raw:
        parts = window(text)
        for k, part in enumerate(parts):
            m = meta[doc]
            out.append({
                "chunk_id": f"C-{len(out) + 1:04d}", "doc_id": doc, "run_ids": rids, "section": sec,
                "page_or_paragraph": loc if len(parts) == 1 else f"{loc} part {k + 1}/{len(parts)}",
                "text": part, "source_url": m["source_url"], "doi": m["doi"] or None,
                "date_retrieved": m["date_retrieved"], "approx_tokens": ntok(part),
                "chunk_type": "short_excerpt" if ai else "section_text",
                "ai_assisted": ai,
            })
    with open(DATA / "chunks.jsonl", "w", encoding="utf-8") as f:
        for c in out:
            f.write(json.dumps(c, ensure_ascii=False) + "\n")
    return out


def selfcheck_chunks(chunks, runs):
    run_ids = {r["run_id"] for r in runs}
    for c in chunks:
        assert c["approx_tokens"] <= CHUNK_MAX + 10, c["chunk_id"]
        assert set(c["run_ids"]) <= run_ids, c["chunk_id"]
        if c["chunk_type"] == "short_excerpt":
            assert len(c["text"].split()) <= 70, f"{c['chunk_id']}: excerpt too long for copyright limit"
    w = window(" ".join(f"w{i}" for i in range(1000)))
    assert len(w) > 1 and w[0].split()[-1] in w[1].split() and w[-1].split()[-1] == "w999", "window broken"


K1, B = 1.2, 0.75  # mirror config.yaml keyword.k1 / keyword.b


STOP = set("a an and are as at be by did do does for from how in is it me of on or that the this to was were what when which who why will with you your".split())


def terms(text):
    return [t for t in re.findall(r"[a-z0-9]+(?:[.\-/][a-z0-9]+)*", text.lower()) if t not in STOP]


def build_bm25(chunks):
    """Write data/bm25_index.json: per-chunk term frequencies, doc lengths, document frequencies."""
    tfs = [{} for _ in chunks]
    for tf, c in zip(tfs, chunks):
        for t in terms(c["text"]):
            tf[t] = tf.get(t, 0) + 1
    df = {}
    for tf in tfs:
        for t in tf:
            df[t] = df.get(t, 0) + 1
    index = {"k1": K1, "b": B, "n": len(chunks), "avgdl": sum(sum(tf.values()) for tf in tfs) / len(chunks),
             "df": df, "docs": [{"chunk_id": c["chunk_id"], "len": sum(tf.values()), "tf": tf} for c, tf in zip(chunks, tfs)]}
    (DATA / "bm25_index.json").write_text(json.dumps(index), encoding="utf-8")
    return index


def bm25_search(index, query, k=5):
    scores = bm25_scores(index, query)
    return [cid for s, cid in sorted(scores, reverse=True)[:k] if s > 0]


def bm25_scores(index, query):
    """[(score, chunk_id)] for every chunk, in index order."""
    import math
    scores = []
    for d in index["docs"]:
        s = 0.0
        for t in set(terms(query)):
            f = d["tf"].get(t)
            if f:
                idf = math.log(1 + (index["n"] - index["df"][t] + 0.5) / (index["df"][t] + 0.5))
                s += idf * f * (index["k1"] + 1) / (f + index["k1"] * (1 - index["b"] + index["b"] * d["len"] / index["avgdl"]))
        scores.append((s, d["chunk_id"]))
    return scores


if __name__ == "__main__":
    manifest = read_csv("manifest.csv")
    runs = read_csv("runs_curated.csv") + read_csv("runs_psi.csv")  # hand-curated text runs + scripted PSI table runs
    write_csv("runs.csv", runs, list(runs[0].keys()))
    check_runs(runs, manifest)
    counts = split_runs(runs)
    chunks = build_chunks(manifest)
    selfcheck_chunks(chunks, runs)
    idx = build_bm25(chunks)
    assert bm25_search(idx, "USML-1 STS-50 oxygen nitrogen")[0] == "C-0001", "bm25 self-check"
    assert bm25_search(idx, "chocolate cake recipe") == [], "bm25 off-topic self-check"
    print(json.dumps({"runs_total": len(runs), **counts, "chunks": len(chunks)}, indent=1))
