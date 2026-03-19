"""
Navidrome / Subsonic API client.
Handles authentication, library browsing, and playlist management.
"""
import hashlib
import secrets
from typing import Optional

import httpx

from config import settings

SUBSONIC_VERSION = "1.16.1"
CLIENT_NAME      = "Driftwave"


def _auth_params() -> dict:
    """Generate Subsonic token-based auth params."""
    salt  = secrets.token_hex(6)
    token = hashlib.md5(f"{settings.NAVIDROME_PASS}{salt}".encode()).hexdigest()
    return {
        "u": settings.NAVIDROME_USER,
        "t": token,
        "s": salt,
        "v": SUBSONIC_VERSION,
        "c": CLIENT_NAME,
        "f": "json",
    }


async def _get(endpoint: str, extra_params: dict = {}) -> dict:
    params = {**_auth_params(), **extra_params}
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{settings.NAVIDROME_URL}/rest/{endpoint}",
            params=params,
            timeout=15,
        )
        r.raise_for_status()
        data = r.json()
        resp = data.get("subsonic-response", {})
        if resp.get("status") != "ok":
            raise Exception(f"Subsonic error: {resp.get('error', {})}")
        return resp


# ── Library ───────────────────────────────────────────

async def get_artists() -> list[dict]:
    resp    = await _get("getArtists")
    indexes = resp.get("artists", {}).get("index", [])
    artists = []
    for idx in indexes:
        for a in idx.get("artist", []):
            artists.append(a)
    return artists


async def get_artist_albums(artist_id: str) -> list[dict]:
    resp = await _get("getArtist", {"id": artist_id})
    return resp.get("artist", {}).get("album", [])


async def get_album(album_id: str) -> dict:
    resp = await _get("getAlbum", {"id": album_id})
    return resp.get("album", {})


async def get_song(song_id: str) -> dict:
    resp = await _get("getSong", {"id": song_id})
    return resp.get("song", {})


async def search_library(query: str, limit: int = 20) -> dict:
    resp = await _get("search3", {
        "query":       query,
        "artistCount": 5,
        "albumCount":  5,
        "songCount":   limit,
    })
    return resp.get("searchResult3", {})


# ── Playlists ─────────────────────────────────────────

async def get_playlists() -> list[dict]:
    resp = await _get("getPlaylists")
    return resp.get("playlists", {}).get("playlist", [])


async def get_playlist(playlist_id: str) -> dict:
    resp = await _get("getPlaylist", {"id": playlist_id})
    return resp.get("playlist", {})


async def create_playlist(name: str, song_ids: list[str]) -> dict:
    """Create a new playlist with given track IDs."""
    params = {"name": name}
    for song_id in song_ids:
        params.setdefault("songId", [])
        if isinstance(params["songId"], list):
            params["songId"].append(song_id)

    # Subsonic requires repeated params — use httpx params list
    param_list = list(_auth_params().items()) + [("name", name)]
    for song_id in song_ids:
        param_list.append(("songId", song_id))

    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{settings.NAVIDROME_URL}/rest/createPlaylist",
            params=param_list,
            timeout=15,
        )
        r.raise_for_status()
        data = r.json().get("subsonic-response", {})
        return data.get("playlist", {})


async def delete_playlist(playlist_id: str) -> bool:
    await _get("deletePlaylist", {"id": playlist_id})
    return True


# ── Stream URL ────────────────────────────────────────

def get_stream_url(song_id: str, max_bitrate: int = 320, public: bool = False) -> str:
    base   = settings.NAVIDROME_PUBLIC_URL if public else settings.NAVIDROME_URL
    params = {**_auth_params(), "id": song_id, "maxBitRate": max_bitrate}
    query  = "&".join(f"{k}={v}" for k, v in params.items())
    return f"{base}/rest/stream?{query}"


def get_cover_art_url(cover_id: str, size: int = 300, public: bool = False) -> str:
    base   = settings.NAVIDROME_PUBLIC_URL if public else settings.NAVIDROME_URL
    params = {**_auth_params(), "id": cover_id, "size": size}
    query  = "&".join(f"{k}={v}" for k, v in params.items())
    return f"{base}/rest/getCoverArt?{query}"


# ── Scan ──────────────────────────────────────────────

async def trigger_scan() -> bool:
    try:
        await _get("startScan")
        return True
    except Exception:
        return False


async def get_scan_status() -> dict:
    resp = await _get("getScanStatus")
    return resp.get("scanStatus", {})


# ── Subsonic ID lookup ────────────────────────────────

async def find_song_by_path(file_path: str) -> Optional[str]:
    """Find Navidrome song ID by file path via search."""
    from pathlib import Path
    title = Path(file_path).stem
    results = await search_library(title, limit=5)
    songs   = results.get("song", [])
    for song in songs:
        if song.get("path", "").endswith(Path(file_path).name):
            return song.get("id")
    return songs[0].get("id") if songs else None
