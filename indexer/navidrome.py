"""Navidrome Subsonic client for the indexer — song ID lookup only."""
import hashlib
import re
import secrets
from pathlib import Path

import httpx

from config import settings

# Strip download-site suffixes like "(StarMusiQ.Com)", "[MassTamilan]"
_SITE_RE = re.compile(
    r'[\(\[]\s*(?:starmusiq|masstamilan|isaimini|kuttyweb|tamilwire|'
    r'tamiltunes|123musiq|feel\s+the\s+diff)[^\)\]]*[\)\]]',
    re.I,
)
# Strip track-number prefixes like "01-03 - ", "02. ", "1 - "
_TRACKNUM_RE = re.compile(r'^\d+[\s.\-]+(?:\d+[\s.\-]+)?')


def _norm(s: str) -> str:
    """Normalize a title or filename stem for fuzzy matching."""
    s = _SITE_RE.sub("", s)
    s = _TRACKNUM_RE.sub("", s)
    return s.strip().lower()

SUBSONIC_VERSION = "1.16.1"
CLIENT_NAME      = "DriftwaveIndexer"


def _auth_params() -> dict:
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


import logging
_log = logging.getLogger(__name__)


async def find_song_id(title: str, file_path: str) -> str:
    """
    Look up Navidrome song ID by searching for the title,
    then matching by filename. Returns "" if not found.
    """
    try:
        params = {**_auth_params(), "query": title, "songCount": 10,
                  "artistCount": 0, "albumCount": 0}
        url = f"{settings.NAVIDROME_URL}/rest/search3"
        async with httpx.AsyncClient() as client:
            r = await client.get(url, params=params, timeout=10)
            r.raise_for_status()
        data = r.json().get("subsonic-response", {})
        if data.get("status") != "ok":
            _log.warning("Navidrome search3 status=%s error=%s",
                         data.get("status"), data.get("error"))
            return ""

        songs     = data.get("searchResult3", {}).get("song", [])
        our_stem  = _norm(Path(file_path).stem)
        our_title = _norm(title)

        for song in songs:
            if _norm(Path(song.get("path", "")).stem) == our_stem:
                return str(song.get("id", ""))

        for song in songs:
            if _norm(song.get("title", "")) == our_title:
                return str(song.get("id", ""))

        _log.debug("subsonic_id: no match for '%s' (%d candidates)", title, len(songs))

    except Exception as exc:
        _log.warning("find_song_id failed for '%s': %s", title, exc)
    return ""
