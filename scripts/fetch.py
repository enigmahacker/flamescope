"""Pipeline step 1: download every manifest source into raw/.

Usage: python3 -I scripts/fetch.py [--force]
Only documents listed in data/manifest.csv are fetched (no manifest entry, no ingest).
NTRS -> raw/<ntrs_id>.json (+ .txt full text when NTRS offers one)
PSI  -> raw/<PSI-n>.json (+ experimental-table CSVs)
"""
import csv, json, re, sys, urllib.parse, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "raw"
NTRS_API = "https://ntrs.nasa.gov/api/citations/"
PSI_API = "https://psi.nasa.gov/geode-py/ws/"
UA = {"User-Agent": "flame-spread-rag-pipeline/0.1"}


def get(url, timeout=60):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
        return r.read()


def save(name, data, force):
    p = RAW / name
    if p.exists() and not force:
        return "cached"
    p.write_bytes(data)
    return f"{len(data)} B"


def fetch_ntrs(nid, force):
    meta = json.loads(get(NTRS_API + nid))
    out = [save(f"{nid}.json", json.dumps(meta, indent=1).encode(), force)]
    for d in meta.get("downloads") or []:
        txt = (d.get("links") or {}).get("fulltext")
        if txt:
            out.append(save(f"{nid}.txt", get("https://ntrs.nasa.gov" + txt), force))
            break
    else:
        out.append("no full text on NTRS")
    return out


def fetch_psi(acc, force):
    meta = json.loads(get(PSI_API + "repo/investigations/" + acc))
    out = [save(f"{acc}.json", json.dumps(meta, indent=1).encode(), force)]
    assert meta.get("licenseIdentifier"), f"{acc}: no license on record; do not ingest"
    for t in meta.get("experimentalTable") or []:
        fn = t["file_name"]
        if (RAW / fn).exists() and not force:
            out.append(f"{fn} cached")
            continue
        q = urllib.parse.urlencode({"file": fn, "version": meta.get("version", 1), "redirect": "false"})
        signed = get(f"{PSI_API}studies/{acc}/download?{q}").decode().strip()
        assert signed.startswith("https://psi-repo-prod.s3.amazonaws.com/"), f"{acc}: unexpected download host"
        out.append(f"{fn} {save(fn, get(signed), True)}")
    return out


def main(force=False):
    RAW.mkdir(exist_ok=True)
    with open(ROOT / "data/manifest.csv", newline="", encoding="utf-8") as f:
        manifest = list(csv.DictReader(f))
    for m in manifest:
        url = m["source_url"]
        try:
            if n := re.search(r"ntrs\.nasa\.gov/citations/(\d+)", url):
                res = fetch_ntrs(n[1], force)
            elif p := re.search(r"investigations/(PSI-\d+)", url):
                res = fetch_psi(p[1], force)
            else:
                res = ["no fetcher for this source; add raw file by hand"]
        except Exception as e:  # keep going; one dead source must not stop the run
            res = [f"FAILED: {e}"]
        print(m["doc_id"], url, "|", "; ".join(res))


if __name__ == "__main__":
    main(force="--force" in sys.argv)
