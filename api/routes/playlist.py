"""Playlist routes — generate and push to Navidrome."""
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from core.retriever import search as rag_search
from core.navidrome import create_playlist, get_playlists, get_playlist, delete_playlist

router = APIRouter()


class GenerateRequest(BaseModel):
    prompt:      str
    name:        Optional[str] = None
    limit:       int           = 20
    lang_filter: Optional[str] = None


class PushRequest(BaseModel):
    tracks:  list[dict]
    name:    str
    prompt:  Optional[str] = None


class GenerateAndPushRequest(BaseModel):
    prompt:      str
    name:        Optional[str] = None
    limit:       int           = 20
    lang_filter: Optional[str] = None


@router.post("/generate")
async def generate(req: GenerateRequest):
    """Generate a playlist from a natural language prompt."""
    tracks = await rag_search(
        prompt=req.prompt,
        limit=req.limit,
        lang_filter=req.lang_filter,
    )
    name = req.name or f"Driftwave: {req.prompt[:40]}"
    return {
        "name":   name,
        "prompt": req.prompt,
        "tracks": tracks,
        "count":  len(tracks),
    }


@router.post("/push")
async def push(req: PushRequest):
    """Push a track list as a playlist to Navidrome."""
    song_ids = [
        t.get("subsonic_id")
        for t in req.tracks
        if t.get("subsonic_id")
    ]
    if not song_ids:
        raise HTTPException(
            status_code=400,
            detail="No tracks with Navidrome IDs. Run indexer with Navidrome sync first.",
        )

    playlist = await create_playlist(req.name, song_ids)
    return {
        "playlist_id": playlist.get("id"),
        "name":        playlist.get("name"),
        "track_count": len(song_ids),
    }


@router.post("/generate-and-push")
async def generate_and_push(req: GenerateAndPushRequest):
    """Generate a playlist and immediately push to Navidrome."""
    tracks = await rag_search(
        prompt=req.prompt,
        limit=req.limit,
        lang_filter=req.lang_filter,
    )
    name = req.name or f"Driftwave: {req.prompt[:40]}"
    song_ids = [t.get("subsonic_id") for t in tracks if t.get("subsonic_id")]

    if not song_ids:
        return {
            "name":    name,
            "tracks":  tracks,
            "pushed":  False,
            "message": "No Navidrome IDs — playlist not pushed",
        }

    playlist = await create_playlist(name, song_ids)
    return {
        "playlist_id": playlist.get("id"),
        "name":        name,
        "tracks":      tracks,
        "pushed":      True,
        "track_count": len(song_ids),
    }


@router.get("/list")
async def list_playlists():
    """List all Navidrome playlists."""
    playlists = await get_playlists()
    return {"playlists": playlists, "count": len(playlists)}


@router.get("/{playlist_id}")
async def get_playlist_detail(playlist_id: str):
    """Get a specific playlist from Navidrome."""
    playlist = await get_playlist(playlist_id)
    return playlist


@router.delete("/{playlist_id}")
async def remove_playlist(playlist_id: str):
    """Delete a playlist from Navidrome."""
    await delete_playlist(playlist_id)
    return {"deleted": playlist_id}
