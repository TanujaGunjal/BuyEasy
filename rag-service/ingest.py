"""
ingest.py — Chunk and embed policy documents into MongoDB Atlas.

Usage:
  export GEMINI_API_KEY=...
  export MONGO_URI=...
  export EMBED_MODEL=gemini-embedding-001   # optional, this is the default
  python ingest.py

What it does:
  1. Reads every *.md file in rag-service/docs/
  2. Splits each file on '## ' headings (one chunk per ## section)
  3. Skips sections shorter than MIN_CHUNK_CHARS characters
  4. Embeds each chunk with RETRIEVAL_DOCUMENT task type, 768 dims
  5. Clears the policy_chunks collection and inserts all new chunks

Run this whenever policy documents change.
"""

import os
import pathlib
import re
import sys
import time

from google import genai
from google.genai import types
from pymongo import MongoClient

# ── Configuration ─────────────────────────────────────────────────────────────

GEMINI_API_KEY  = os.environ["GEMINI_API_KEY"]
MONGO_URI       = os.environ["MONGO_URI"]
EMBED_MODEL     = os.environ.get("EMBED_MODEL", "gemini-embedding-001")
DOCS_DIR        = pathlib.Path(__file__).parent / "docs"
MIN_CHUNK_CHARS = 50   # skip very short sections (e.g. empty headings)

# ── Clients ───────────────────────────────────────────────────────────────────

genai_client = genai.Client(api_key=GEMINI_API_KEY)
mongo_client = MongoClient(MONGO_URI)
db           = mongo_client.get_database("buyeasy")
collection   = db["policy_chunks"]


# ── Chunking ──────────────────────────────────────────────────────────────────

def chunk_markdown(filepath: pathlib.Path) -> list[dict]:
    """
    Split a markdown file on '## ' headings.
    Returns a list of dicts: {source, heading, text}.
    """
    source   = filepath.name          # e.g. "returns.md"
    content  = filepath.read_text(encoding="utf-8")
    # Split on lines that start with '## ' (level-2 headings)
    sections = re.split(r"\n(?=## )", content)

    chunks = []
    for section in sections:
        lines   = section.strip().splitlines()
        if not lines:
            continue
        heading_line = lines[0].strip()
        heading      = re.sub(r"^#+\s*", "", heading_line)  # strip leading #s
        body         = "\n".join(lines[1:]).strip()

        if len(body) < MIN_CHUNK_CHARS:
            continue

        chunks.append({"source": source, "heading": heading, "text": body})

    return chunks


# ── Embedding ─────────────────────────────────────────────────────────────────

def embed_chunks(chunks: list[dict]) -> list[dict]:
    """
    Embed each chunk's text with RETRIEVAL_DOCUMENT task type.
    Adds an 'embedding' key (list[float], 768 dims) to each chunk dict.
    Includes a small delay to avoid hitting Gemini rate limits.
    """
    embedded = []
    for i, chunk in enumerate(chunks, 1):
        response = genai_client.models.embed_content(
            model=EMBED_MODEL,
            contents=chunk["text"],
            config=types.EmbedContentConfig(
                task_type="RETRIEVAL_DOCUMENT",
                output_dimensionality=768,
            ),
        )
        chunk["embedding"] = response.embeddings[0].values
        embedded.append(chunk)
        print(f"  [{i}/{len(chunks)}] Embedded: {chunk['source']} / {chunk['heading']}")
        # Small sleep to stay within Gemini free-tier rate limits (60 req/min)
        time.sleep(0.05)

    return embedded


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    md_files = sorted(DOCS_DIR.glob("*.md"))
    if not md_files:
        print(f"No .md files found in {DOCS_DIR}", file=sys.stderr)
        sys.exit(1)

    print(f"Found {len(md_files)} policy document(s): {[f.name for f in md_files]}")

    all_chunks: list[dict] = []
    for filepath in md_files:
        chunks = chunk_markdown(filepath)
        print(f"  {filepath.name}: {len(chunks)} chunk(s)")
        all_chunks.extend(chunks)

    if not all_chunks:
        print("No chunks produced — check that docs have ## sections.", file=sys.stderr)
        sys.exit(1)

    print(f"\nEmbedding {len(all_chunks)} chunks with model '{EMBED_MODEL}'...")
    embedded = embed_chunks(all_chunks)

    print("\nWriting to MongoDB Atlas (policy_chunks)...")
    collection.delete_many({})          # clear existing data
    result = collection.insert_many(embedded)

    print(f"\nIndexed {len(result.inserted_ids)} chunks into policy_chunks")


if __name__ == "__main__":
    main()
