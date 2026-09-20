"""
eval.py — Retrieval evaluation for the ShopAgent RAG service.

Usage:
  export RAG_SERVICE_URL=https://shopagent-rag-xxxx-el.a.run.app
  export RAG_SHARED_SECRET=<your-secret>
  python eval.py

Metrics reported:
  - hit@3       : fraction of in-scope questions where the correct source
                  file appeared in the top-3 results
  - MRR         : mean reciprocal rank for in-scope questions
  - off-topic rejection : fraction of off-topic questions that correctly
                          return 0 results (empty list after MIN_SCORE filter)
  - missed questions    : list of in-scope misses with what was retrieved
  - avg latency         : average wall-clock time per /search call (seconds)

Fill in the numbers from this script into README.md after running against
the live service. Do NOT hard-code any numbers in the source files.
"""

import json
import os
import sys
import time
from pathlib import Path

try:
    import requests
except ImportError:
    sys.exit("requests not installed. Run: pip install requests")

# ── Configuration ─────────────────────────────────────────────────────────────

RAG_SERVICE_URL   = os.environ.get("RAG_SERVICE_URL", "http://localhost:8080")
RAG_SHARED_SECRET = os.environ.get("RAG_SHARED_SECRET", "")
EVAL_SET_PATH     = Path(__file__).parent / "eval_set.json"
K                 = 3   # top-k results to request

if not RAG_SHARED_SECRET:
    sys.exit("RAG_SHARED_SECRET env var is not set.")


# ── Load eval set ─────────────────────────────────────────────────────────────

with EVAL_SET_PATH.open() as f:
    eval_set = json.load(f)

in_scope  = [item for item in eval_set if item["source"] is not None]
off_topic = [item for item in eval_set if item["source"] is None]

print(f"Loaded {len(eval_set)} eval items: {len(in_scope)} in-scope, {len(off_topic)} off-topic")
print(f"Querying {RAG_SERVICE_URL} with k={K}\n")


# ── Query helper ──────────────────────────────────────────────────────────────

def search(question: str) -> tuple[list[dict], float]:
    """
    Call /search and return (results, latency_seconds).
    Returns ([], latency) on any error.
    """
    start = time.monotonic()
    try:
        resp = requests.post(
            f"{RAG_SERVICE_URL}/search",
            json={"question": question, "k": K},
            headers={"X-Internal-Key": RAG_SHARED_SECRET},
            timeout=15,
        )
        latency = time.monotonic() - start
        resp.raise_for_status()
        data = resp.json()
        return data.get("results", []), latency
    except Exception as e:
        latency = time.monotonic() - start
        print(f"  [ERROR] {e}")
        return [], latency


# ── In-scope evaluation ───────────────────────────────────────────────────────

hits        = 0
reciprocals = []
missed      = []
latencies   = []

print("── In-scope questions ──────────────────────────────────────────────────")
for item in in_scope:
    q      = item["q"]
    target = item["source"]
    results, latency = search(q)
    latencies.append(latency)

    sources = [r["source"] for r in results]
    hit_rank = None
    for rank, src in enumerate(sources, 1):
        if src == target:
            hit_rank = rank
            break

    if hit_rank is not None:
        hits += 1
        reciprocals.append(1.0 / hit_rank)
        status = f"HIT  (rank {hit_rank})"
    else:
        reciprocals.append(0.0)
        missed.append({
            "question": q,
            "expected_source": target,
            "retrieved": [{"source": r["source"], "heading": r["heading"], "score": r["score"]}
                          for r in results],
        })
        status = "MISS"

    print(f"  [{status}] {q[:70]}")

hit_at_3 = hits / len(in_scope) if in_scope else 0
mrr      = sum(reciprocals) / len(reciprocals) if reciprocals else 0


# ── Off-topic evaluation ──────────────────────────────────────────────────────

print("\n── Off-topic questions ─────────────────────────────────────────────────")
off_correct = 0
for item in off_topic:
    q = item["q"]
    results, latency = search(q)
    latencies.append(latency)

    correct = len(results) == 0   # correct rejection = empty results
    if correct:
        off_correct += 1
    status = "CORRECT (no results)" if correct else f"WRONG  ({len(results)} results returned)"
    print(f"  [{status}] {q[:70]}")

off_topic_rejection = off_correct / len(off_topic) if off_topic else 0


# ── Summary ───────────────────────────────────────────────────────────────────

avg_latency = sum(latencies) / len(latencies) if latencies else 0

print("\n" + "═" * 70)
print("RETRIEVAL EVALUATION RESULTS")
print("═" * 70)
print(f"  hit@3 (in-scope)        : {hit_at_3:.3f}  ({hits}/{len(in_scope)})")
print(f"  MRR                     : {mrr:.3f}")
print(f"  off-topic rejection     : {off_topic_rejection:.3f}  ({off_correct}/{len(off_topic)})")
print(f"  avg latency per call    : {avg_latency:.3f} s")
print("═" * 70)

if missed:
    print(f"\n── Missed questions ({len(missed)}) ────────────────────────────────────────")
    for m in missed:
        print(f"\n  Q: {m['question']}")
        print(f"  Expected source : {m['expected_source']}")
        if m["retrieved"]:
            print("  Retrieved instead:")
            for r in m["retrieved"]:
                print(f"    - {r['source']} / {r['heading']}  (score={r['score']})")
        else:
            print("  Retrieved instead: (nothing — all results below MIN_SCORE)")
    print()
    print("Improvement suggestions:")
    print("  - If many misses have 0 results: lower MIN_SCORE or improve doc coverage")
    print("  - If misses retrieve wrong source: improve chunk wording or add synonyms")
    print("  - If score is close to MIN_SCORE: consider lowering MIN_SCORE by 0.05")
else:
    print("\nAll in-scope questions hit! 🎉")
