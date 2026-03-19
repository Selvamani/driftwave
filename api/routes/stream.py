"""Stream route — redirect to Navidrome using browser-accessible public URL."""
from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import RedirectResponse

from core.navidrome import get_stream_url, get_cover_art_url, find_song_by_path

router = APIRouter()


@router.get("/cover/{cover_id}")
async def cover_art(cover_id: str, size: int = 300):
    url = get_cover_art_url(cover_id, size=size, public=True)
    return RedirectResponse(url=url)


@router.get("/by-path")
async def stream_by_path(path: str = Query(...), bitrate: int = 320):
    """Resolve a file-system path to a Navidrome stream URL."""
    song_id = await find_song_by_path(path)
    if not song_id:
        raise HTTPException(status_code=404, detail="Track not found in Navidrome")
    url = get_stream_url(song_id, max_bitrate=bitrate, public=True)
    return RedirectResponse(url=url)


@router.get("/{song_id}")
async def stream(song_id: str, bitrate: int = 320):
    url = get_stream_url(song_id, max_bitrate=bitrate, public=True)
    return RedirectResponse(url=url)
