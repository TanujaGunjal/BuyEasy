"""
app.py — RAG search service for ShopAgent policy documents.

Endpoints:
  GET  /health   — liveness probe (no auth)
  POST /search   — embed question, vector-search policy_chunks, return top-k results

Authentication: X-Internal-Key header (shared secret, compared with hmac.compare_digest)
"""

import hmac
import os
import time
from typing import Optional

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse
from google import genai
from google.genai import types
from pymongo import MongoClient
from pydantic import BaseModel

# ── Configuration ─────────────────────────────────────────────────────────────

GEMINI_API_KEY   = os.environ["GEMINI_API_KEY"]
MONGO_URI        = os.environ["MONGO_URI"]
RAG_SHARED_SECRET = os.environ["RAG_SHARED_SECRET"]
EMBED_MODEL      = os.environ.get("EMBED_MODEL", "gemini-embedding-001")
MIN_SCORE        = float(os.environ.get("MIN_SCORE", "0.6"))

# ── SDK + DB clients ──────────────────────────────────────────────────────────

genai_client = genai.Client(api_key=GEMINI_API_KEY)

mongo_client = MongoClient(MONGO_URI)
db           = mongo_client.get_database("buyeasy")
collection   = db["policy_chunks"]

# ── FastAPI app ───────────────────────────────────────────────────────────────

app = FastAPI(title="ShopAgent RAG Service", version="1.0.0")


# ── Auth helper ───────────────────────────────────────────────────────────────

def _require_auth(x_internal_key: Optional[str]) -> None:
    """Validate X-Internal-Key using constant-time comparison to prevent timing attacks."""
    if x_internal_key is None or not hmac.compare_digest(
        x_internal_key.encode(), RAG_SHARED_SECRET.encode()
    ):
        raise HTTPException(status_code=401, detail="Unauthorized")


# ── Models ────────────────────────────────────────────────────────────────────

class SearchRequest(BaseModel):
    question: str
    k: int = 3


class SearchResult(BaseModel):
    source: str
    heading: str
    text: str
    score: float


class SearchResponse(BaseModel):
    results: list[SearchResult]


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    """Liveness probe — no auth required."""
    return {"status": "ok"}


@app.post("/search", response_model=SearchResponse)
def search(
    body: SearchRequest,
    x_internal_key: Optional[str] = Header(default=None),
):
    """
    Embed the question and run Atlas $vectorSearch against policy_chunks.

    Returns up to k results with score >= MIN_SCORE.
    """
    _require_auth(x_internal_key)

    # Embed the question using RETRIEVAL_QUERY task type
    embed_response = genai_client.models.embed_content(
        model=EMBED_MODEL,
        contents=body.question,
        config=types.EmbedContentConfig(
            task_type="RETRIEVAL_QUERY",
            output_dimensionality=768,
        ),
    )
    query_vector = embed_response.embeddings[0].values

    # Atlas Vector Search aggregation pipeline
    pipeline = [
        {
            "$vectorSearch": {
                "index":         "policy_vector_index",
                "path":          "embedding",
                "queryVector":   query_vector,
                "numCandidates": 50,
                "limit":         body.k,
            }
        },
        {
            "$project": {
                "_id":     0,
                "source":  1,
                "heading": 1,
                "text":    1,
                "score":   {"$meta": "vectorSearchScore"},
            }
        },
    ]

    raw_results = list(collection.aggregate(pipeline))

    # Filter by minimum score threshold
    results = [
        SearchResult(
            source=r["source"],
            heading=r["heading"],
            text=r["text"],
            score=round(r["score"], 4),
        )
        for r in raw_results
        if r.get("score", 0) >= MIN_SCORE
    ]

    return SearchResponse(results=results)
