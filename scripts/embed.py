"""SI-generated code: written by Claude (Anthropic) via Claude Code under team direction. Project idea: human (team).

Embed chunks with the model in config.yaml and provide hybrid (BM25 + embedding) search.

Usage: .venv/bin/python scripts/embed.py   (after scripts/build.py; needs Hugging Face access to the gated model)
"""
import json, sys
from pathlib import Path

import numpy as np
import yaml
from sentence_transformers import SentenceTransformer

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build  # noqa: E402

ROOT = build.ROOT
CFG = yaml.safe_load((ROOT / "config.yaml").read_text(encoding="utf-8"))
EMB, RET = CFG["embedding"], CFG["retrieval"]


def load_model():
    return SentenceTransformer(EMB["model_name"], revision=EMB["model_version"], device="cpu")


def embed_chunks(model):
    chunks = [json.loads(l) for l in open(ROOT / CFG["data"]["chunks"], encoding="utf-8")]
    vecs = model.encode([EMB["document_prompt"] + c["text"] for c in chunks], normalize_embeddings=True)
    assert vecs.shape[1] == EMB["dimensions"], f"model returned {vecs.shape[1]} dims, config says {EMB['dimensions']}"
    np.save(ROOT / "data/embeddings.npy", vecs)
    meta = {"model_name": EMB["model_name"], "model_version": EMB["model_version"], "chunk_ids": [c["chunk_id"] for c in chunks]}
    (ROOT / "data/embeddings_meta.json").write_text(json.dumps(meta, indent=1), encoding="utf-8")
    return chunks, vecs


def hybrid_search(model, index, vecs, query, k=None):
    """[(score, chunk_id)]. Empty list = nothing relevant, so the system must refuse."""
    k = k or RET["top_k"]
    bm = np.array([s for s, _ in build.bm25_scores(index, query)])
    cos = vecs @ model.encode(EMB["query_prompt"] + query, normalize_embeddings=True)
    norm = lambda x: (x - x.min()) / (x.max() - x.min()) if x.max() > x.min() else np.zeros_like(x)
    score = RET["hybrid_weight_bm25"] * norm(bm) + RET["hybrid_weight_embedding"] * norm(cos)
    keep = (bm > 0) | (cos >= RET["min_cosine"])  # min-max scaling always yields a top hit; this gate allows refusal
    ids = [d["chunk_id"] for d in index["docs"]]
    order = [i for i in np.argsort(-score) if keep[i]][:k]
    return [(round(float(score[i]), 4), ids[i]) for i in order]


if __name__ == "__main__":
    model = load_model()
    chunks, vecs = embed_chunks(model)
    index = json.loads((ROOT / "data/bm25_index.json").read_text(encoding="utf-8"))
    assert [d["chunk_id"] for d in index["docs"]] == [c["chunk_id"] for c in chunks], "bm25 and embeddings out of sync"
    probes = {
        "What oxygen fraction did the USML-1 solid surface experiment use?": "C-0001",
        "Did Spread Across Liquids report steadier spread in microgravity?": "C-0008",
        "What is the best pizza topping?": "REFUSE",
        "Who won the 1998 football world cup?": "REFUSE",
    }
    for q, want in probes.items():
        hits = hybrid_search(model, index, vecs, q)
        top_cos = float((vecs @ model.encode(EMB["query_prompt"] + q, normalize_embeddings=True)).max())
        print(f"{q!r} max_cos={top_cos:.3f} -> {hits[:3]}")
        if want == "REFUSE":
            assert hits == [], f"should refuse: {q}"
        else:
            assert hits and hits[0][1] == want, f"{q}: expected {want} first"
    print(f"embedded {len(chunks)} chunks, dims {vecs.shape[1]}")
