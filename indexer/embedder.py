"""
Dual embedding strategy:
  - Text embedding: sentence-transformers all-MiniLM-L6-v2 (384-dim)
  - Audio embedding: DCLAP (512-dim)
Both stored in separate Qdrant collections.
"""
import os
import hashlib
from typing import Optional

import numpy as np
import torch
from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance, VectorParams, PointStruct,
    Filter, FieldCondition, MatchValue, Range,
    PayloadSchemaType, TextIndexParams, TokenizerType,
)

from config import settings, TEXT_COLLECTION, AUDIO_COLLECTION
from models import EnrichedTrack

# ── Device ────────────────────────────────────────────
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# ── Models (lazy loaded) ──────────────────────────────
_text_model:  Optional[SentenceTransformer] = None
_clap_model  = None
_clap_proc   = None
_qdrant:      Optional[QdrantClient] = None


def get_qdrant() -> QdrantClient:
    global _qdrant
    if _qdrant is None:
        _qdrant = QdrantClient(host=settings.QDRANT_HOST, port=settings.QDRANT_PORT)
    return _qdrant


def get_text_model() -> SentenceTransformer:
    global _text_model
    if _text_model is None:
        _text_model = SentenceTransformer("all-MiniLM-L6-v2", device=DEVICE)
    return _text_model


def get_clap():
    global _clap_model, _clap_proc
    if _clap_model is None:
        try:
            from transformers import ClapModel, ClapProcessor
            _clap_model = ClapModel.from_pretrained(
                "laion/larger_clap_general"
            ).to(DEVICE)
            _clap_proc  = ClapProcessor.from_pretrained("laion/larger_clap_general")
        except Exception as e:
            print(f"[embedder] CLAP not available: {e}. Audio embedding disabled.")
    return _clap_model, _clap_proc


# ── Collection init ───────────────────────────────────

_FULL_TEXT_INDEX = TextIndexParams(
    type="text",
    tokenizer=TokenizerType.WORD,
    min_token_len=2,
    max_token_len=40,
    lowercase=True,
)

# Fields that need full-text indexes (for MatchText filters)
_TEXT_INDEX_FIELDS = [
    "cultural_meta.film_name",
    "cultural_meta.lyricist",
    "cultural_meta.composer",
    "cultural_meta.film_meta.cast",
    "cultural_meta.film_meta.director",
    "artist",
    "lyrics",
]

# Fields that need keyword indexes (for MatchValue / MatchAny filters)
_KEYWORD_INDEX_FIELDS = [
    "adapter_type",
    "year",
    "genre",
    "key",
    "cultural_meta.tamil_genre",
]


def _ensure_indexes(client: QdrantClient, collection_name: str):
    for field in _TEXT_INDEX_FIELDS:
        try:
            client.create_payload_index(
                collection_name=collection_name,
                field_name=field,
                field_schema=_FULL_TEXT_INDEX,
            )
        except Exception:
            pass  # already exists

    for field in _KEYWORD_INDEX_FIELDS:
        try:
            client.create_payload_index(
                collection_name=collection_name,
                field_name=field,
                field_schema=PayloadSchemaType.KEYWORD,
            )
        except Exception:
            pass  # already exists

    # Numeric range fields
    for field in ["tempo", "energy", "valence", "duration"]:
        try:
            client.create_payload_index(
                collection_name=collection_name,
                field_name=field,
                field_schema=PayloadSchemaType.FLOAT,
            )
        except Exception:
            pass


def init_collections():
    client = get_qdrant()
    existing_names = [c.name for c in client.get_collections().collections]

    # Text collection — 384-dim
    if TEXT_COLLECTION not in existing_names:
        client.create_collection(
            collection_name=TEXT_COLLECTION,
            vectors_config=VectorParams(size=384, distance=Distance.COSINE),
        )
        print(f"[embedder] Created collection: {TEXT_COLLECTION}")

    # Audio CLAP collection — 512-dim
    if AUDIO_COLLECTION not in existing_names:
        client.create_collection(
            collection_name=AUDIO_COLLECTION,
            vectors_config=VectorParams(size=512, distance=Distance.COSINE),
        )
        print(f"[embedder] Created collection: {AUDIO_COLLECTION}")

    # Payload indexes — required for MatchText and fast MatchValue/Range filters
    _ensure_indexes(client, TEXT_COLLECTION)
    print(f"[embedder] Payload indexes ensured on {TEXT_COLLECTION}")


def reset_collections():
    client = get_qdrant()
    for col in [TEXT_COLLECTION, AUDIO_COLLECTION]:
        try:
            client.delete_collection(col)
        except Exception:
            pass
    init_collections()


# ── ID generation ─────────────────────────────────────

def path_to_id(file_path: str) -> int:
    """Stable integer ID from file path."""
    return int(hashlib.md5(file_path.encode()).hexdigest()[:8], 16)


# ── Embedding functions ───────────────────────────────

def embed_text(text: str) -> list[float]:
    model = get_text_model()
    vec = model.encode(text, normalize_embeddings=True)
    return vec.tolist()


def embed_audio_clap(file_path: str) -> Optional[list[float]]:
    model, processor = get_clap()
    if model is None:
        return None
    try:
        import librosa
        audio, sr = librosa.load(file_path, sr=48000, duration=30, mono=True)
        inputs = processor(
            audios=audio,
            return_tensors="pt",
            sampling_rate=sr,
        ).to(DEVICE)
        with torch.no_grad():
            audio_embed = model.get_audio_features(**inputs)
        return audio_embed[0].cpu().tolist()
    except Exception as e:
        print(f"[embedder] CLAP audio embed failed for {file_path}: {e}")
        return None


def embed_text_clap(prompt: str) -> Optional[list[float]]:
    model, processor = get_clap()
    if model is None:
        return None
    try:
        inputs = processor(
            text=[prompt],
            return_tensors="pt",
            padding=True,
        ).to(DEVICE)
        with torch.no_grad():
            text_embed = model.get_text_features(**inputs)
        return text_embed[0].cpu().tolist()
    except Exception:
        return None


# ── Store track ───────────────────────────────────────

def store_track(track: EnrichedTrack):
    client  = get_qdrant()
    payload = track.to_qdrant_payload()
    doc     = track.to_embed_document()
    track_id = path_to_id(track.file_path)

    # 1. Text embedding → TEXT_COLLECTION
    text_vec = embed_text(doc)
    client.upsert(
        collection_name=TEXT_COLLECTION,
        points=[PointStruct(
            id=track_id,
            vector=text_vec,
            payload=payload,
        )],
    )

    # 2. Audio CLAP → AUDIO_COLLECTION (best effort)
    audio_vec = embed_audio_clap(track.file_path)
    if audio_vec:
        client.upsert(
            collection_name=AUDIO_COLLECTION,
            points=[PointStruct(
                id=track_id,
                vector=audio_vec,
                payload=payload,
            )],
        )


def is_indexed(file_path: str) -> bool:
    client   = get_qdrant()
    track_id = path_to_id(file_path)
    try:
        results = client.retrieve(
            collection_name=TEXT_COLLECTION,
            ids=[track_id],
        )
        return len(results) > 0
    except Exception:
        return False


def remove_track(file_path: str):
    client   = get_qdrant()
    track_id = path_to_id(file_path)
    for col in [TEXT_COLLECTION, AUDIO_COLLECTION]:
        try:
            client.delete(collection_name=col, points_selector=[track_id])
        except Exception:
            pass


# ── Search ────────────────────────────────────────────

def search_text(
    prompt:      str,
    limit:       int = 50,
    lang_filter: Optional[str] = None,
    tempo_max:   Optional[float] = None,
    energy_min:  Optional[float] = None,
) -> list[dict]:
    client = get_qdrant()
    query_vec = embed_text(prompt)

    must = []
    if lang_filter:
        must.append(FieldCondition(
            key="adapter_type",
            match=MatchValue(value=lang_filter),
        ))
    if tempo_max:
        must.append(FieldCondition(
            key="tempo",
            range=Range(lte=tempo_max),
        ))
    if energy_min:
        must.append(FieldCondition(
            key="energy",
            range=Range(gte=energy_min),
        ))

    results = client.search(
        collection_name=TEXT_COLLECTION,
        query_vector=query_vec,
        query_filter=Filter(must=must) if must else None,
        limit=limit,
        with_payload=True,
    )
    return [{"score": r.score, **r.payload} for r in results]


def search_clap(
    prompt: str,
    limit:  int = 50,
) -> list[dict]:
    client    = get_qdrant()
    query_vec = embed_text_clap(prompt)
    if not query_vec:
        return []

    results = client.search(
        collection_name=AUDIO_COLLECTION,
        query_vector=query_vec,
        limit=limit,
        with_payload=True,
    )
    return [{"score": r.score, **r.payload} for r in results]


def search_dual(
    prompt:      str,
    limit:       int = 50,
    lang_filter: Optional[str] = None,
    tempo_max:   Optional[float] = None,
    energy_min:  Optional[float] = None,
    text_weight: float = 0.6,
    clap_weight: float = 0.4,
) -> list[dict]:
    """
    Merge text RAG and CLAP audio results.
    score = text_weight × text_score + clap_weight × clap_score
    """
    text_results = search_text(prompt, limit, lang_filter, tempo_max, energy_min)
    clap_results = search_clap(prompt, limit)

    # Build score maps keyed by file_path
    text_scores = {r["file_path"]: r["score"] for r in text_results}
    clap_scores = {r["file_path"]: r["score"] for r in clap_results}
    payloads    = {r["file_path"]: r for r in text_results + clap_results}

    all_paths = set(text_scores) | set(clap_scores)
    merged = []
    for path in all_paths:
        t = text_scores.get(path, 0.0)
        c = clap_scores.get(path, 0.0)
        final = text_weight * t + clap_weight * c
        item = dict(payloads[path])
        item["score"]      = final
        item["text_score"] = t
        item["clap_score"] = c
        merged.append(item)

    merged.sort(key=lambda x: x["score"], reverse=True)
    return merged[:limit]
