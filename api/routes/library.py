"""Library routes — browse artists, albums, tracks via Navidrome."""
from typing import Optional
from fastapi import APIRouter, Query, HTTPException

from core.navidrome import (
    get_artists, get_artist_albums, get_album, search_library
)
from config import settings, TEXT_COLLECTION

router = APIRouter()


def _qdrant_lookup(subsonic_id: Optional[str], path: Optional[str],
                   title: Optional[str], artist: Optional[str]):
    """Return the first matching Qdrant payload, or None."""
    from qdrant_client import QdrantClient
    from qdrant_client.models import Filter, FieldCondition, MatchValue
    import hashlib

    client  = QdrantClient(host=settings.QDRANT_HOST, port=settings.QDRANT_PORT)
    results = []

    if path:
        track_id = int(hashlib.md5(path.encode()).hexdigest()[:8], 16)
        results  = client.retrieve(TEXT_COLLECTION, ids=[track_id], with_payload=True)

    if subsonic_id and not results:
        results, _ = client.scroll(
            collection_name=TEXT_COLLECTION,
            scroll_filter=Filter(must=[
                FieldCondition(key="subsonic_id", match=MatchValue(value=subsonic_id))
            ]),
            limit=1, with_payload=True,
        )

    if title and not results:
        must = [FieldCondition(key="title", match=MatchValue(value=title))]
        if artist:
            must.append(FieldCondition(key="artist", match=MatchValue(value=artist)))
        results, _ = client.scroll(
            collection_name=TEXT_COLLECTION,
            scroll_filter=Filter(must=must),
            limit=1, with_payload=True,
        )

    return results[0].payload if results else None


@router.get("/artists")
async def artists():
    data = await get_artists()
    return {"artists": data, "count": len(data)}


@router.get("/artist/{artist_id}/albums")
async def artist_albums(artist_id: str):
    data = await get_artist_albums(artist_id)
    return {"albums": data, "count": len(data)}


@router.get("/album/{album_id}")
async def album(album_id: str):
    return await get_album(album_id)


@router.get("/search")
async def search(
    q:     str = Query(...),
    limit: int = Query(20),
):
    raw = await search_library(q, limit)
    # Normalize Subsonic singular keys → plural for frontend
    return {
        "artists": raw.get("artist", []),
        "albums":  raw.get("album", []),
        "songs":   raw.get("song", []),
    }


@router.get("/track-meta")
async def track_meta(
    subsonic_id: Optional[str] = Query(None),
    path:        Optional[str] = Query(None),
    title:       Optional[str] = Query(None),
    artist:      Optional[str] = Query(None),
):
    """Return Qdrant enrichment fields for a track (cultural_meta, composer, lyricist, etc.)."""
    if not subsonic_id and not path and not title:
        raise HTTPException(status_code=400, detail="Provide subsonic_id, path, or title")
    try:
        p = _qdrant_lookup(subsonic_id, path, title, artist)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    if not p:
        return {"found": False}

    return {
        "found":        True,
        "adapter_type": p.get("adapter_type"),
        "tempo":        p.get("tempo"),
        "energy":       p.get("energy"),
        "valence":      p.get("valence"),
        "cultural_meta": p.get("cultural_meta", {}),
    }


@router.get("/lyrics")
async def get_lyrics(
    path:        Optional[str] = Query(None),
    subsonic_id: Optional[str] = Query(None),
    title:       Optional[str] = Query(None),
    artist:      Optional[str] = Query(None),
):
    """Fetch stored lyrics from Qdrant. Tries path → subsonic_id → title+artist."""
    if not path and not subsonic_id and not title:
        raise HTTPException(status_code=400, detail="Provide path, subsonic_id, or title")
    try:
        p = _qdrant_lookup(subsonic_id, path, title, artist)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    if not p:
        return {"lyrics": "", "source": "none", "found": False}

    return {
        "lyrics": p.get("lyrics", ""),
        "source": p.get("lyrics_source", "none"),
        "found":  True,
    }


@router.get("/debug/track")
async def debug_track(
    path:        Optional[str] = Query(None),
    subsonic_id: Optional[str] = Query(None),
    title:       Optional[str] = Query(None),
    artist:      Optional[str] = Query(None),
):
    """Return full Qdrant payload for a track — use to diagnose lyrics/metadata issues."""
    if not path and not subsonic_id:
        raise HTTPException(status_code=400, detail="Provide path or subsonic_id")
    try:
        p = _qdrant_lookup(subsonic_id, path, title, artist)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    if not p:
        return {"found": False, "tried": {"path": path, "subsonic_id": subsonic_id, "title": title}}

    return {
        "found":         True,
        "title":         p.get("title"),
        "artist":        p.get("artist"),
        "file_path":     p.get("file_path"),
        "subsonic_id":   p.get("subsonic_id"),
        "adapter_type":  p.get("adapter_type"),
        "lyrics_source": p.get("lyrics_source", "none"),
        "lyrics_len":    len(p.get("lyrics", "")),
        "lyrics":        p.get("lyrics", "") or "(empty)",
        "description":   p.get("description", "") or "(empty)",
        "tempo":         p.get("tempo"),
        "energy":        p.get("energy"),
        "valence":       p.get("valence"),
        "cultural_meta": p.get("cultural_meta", {}),
    }
