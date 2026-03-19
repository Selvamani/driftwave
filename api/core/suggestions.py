"""
Search suggestion cache.
Scrolls Qdrant once at first request, builds in-memory prefix-search buckets.
Invalidated after each index run.
"""
import asyncio
import logging

from config import TEXT_COLLECTION
from core.retriever import get_qdrant

log = logging.getLogger(__name__)

_cache: dict[str, list[str]] | None = None
_cache_lock = asyncio.Lock()


async def _build_cache() -> dict[str, list[str]]:
    client = get_qdrant()
    buckets: dict[str, set[str]] = {
        "composer": set(),
        "director": set(),
        "artist":   set(),
        "film":     set(),
        "cast":     set(),
    }

    offset = None
    while True:
        result, next_offset = client.scroll(
            collection_name=TEXT_COLLECTION,
            offset=offset,
            limit=500,
            with_payload=["cultural_meta", "artist"],
            with_vectors=False,
        )
        for point in result:
            p  = point.payload or {}
            cm = p.get("cultural_meta") or {}
            fm = cm.get("film_meta") or {}

            if cm.get("composer"):
                buckets["composer"].add(cm["composer"].strip())
            if fm.get("director"):
                buckets["director"].add(fm["director"].strip())
            if p.get("artist"):
                buckets["artist"].add(p["artist"].strip())
            if cm.get("film_name"):
                buckets["film"].add(cm["film_name"].strip())
            for actor in (fm.get("cast") or []):
                if actor:
                    buckets["cast"].add(actor.strip())

        if next_offset is None:
            break
        offset = next_offset

    # Convert to sorted lists for deterministic output
    sorted_buckets = {k: sorted(v) for k, v in buckets.items()}
    total = sum(len(v) for v in sorted_buckets.values())
    log.info("[suggestions] cache built: %d entries", total)
    return sorted_buckets


async def get_cache() -> dict[str, list[str]]:
    global _cache
    if _cache is None:
        async with _cache_lock:
            if _cache is None:
                _cache = await _build_cache()
    return _cache


def invalidate_cache():
    global _cache
    _cache = None


def _prefix_match(items: list[str], q: str, limit: int) -> list[str]:
    q_lower = q.lower()
    starts   = [s for s in items if s.lower().startswith(q_lower)]
    contains = [s for s in items if not s.lower().startswith(q_lower) and q_lower in s.lower()]
    return (starts + contains)[:limit]


async def suggest(q: str, limit_per_type: int = 4) -> list[dict]:
    if len(q) < 2:
        return []

    cache = await get_cache()

    order = [
        ("composer", "composer"),
        ("director", "director"),
        ("film",     "film"),
        ("artist",   "artist"),
        ("cast",     "cast"),
    ]

    results = []
    for bucket_key, suggestion_type in order:
        for label in _prefix_match(cache[bucket_key], q, limit_per_type):
            results.append({"type": suggestion_type, "label": label})

    return results
