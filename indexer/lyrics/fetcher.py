"""
Lyrics fetcher — waterfall strategy:
  1. Embedded ID3 USLT tag
  2. .lrc sidecar file
  3. lrclib.net API
  4. Tamil-specific scraper (when lang_hint == "tamil")
  5. Genius API
"""
import re
import os
from pathlib import Path
from typing import Optional

import httpx
from mutagen.id3 import ID3
from mutagen.flac import FLAC


# Sites known to write promotional text into USLT/lyrics tags
_EMBEDDED_NOISE = (
    "feel the difference",   # StarMusiQ
    "starmusiQ", "starmusiq",
    "masstamilan", "isaimini", "kuttyweb",
    "tamilwire", "tamiltunes", "123musiq",
    "cd-rip", "320kbps", "128kbps",
)

def _is_junk_embedded(text: str) -> bool:
    """Return True if the embedded lyrics look like site promo, not real lyrics."""
    lower = text.lower()
    if any(n.lower() in lower for n in _EMBEDDED_NOISE):
        return True
    lines = [l for l in text.splitlines() if l.strip()]
    # Real lyrics have multiple lines; promo is usually 1-2 lines
    if len(lines) < 3:
        return True
    return False


# ── 1. Embedded lyrics ────────────────────────────────

def extract_embedded_lyrics(file_path: str) -> str:
    ext = Path(file_path).suffix.lower()
    try:
        if ext == ".mp3":
            tags = ID3(file_path)
            for key in tags.keys():
                if key.startswith("USLT"):
                    text = tags[key].text
                    if text and len(text.strip()) > 20 and not _is_junk_embedded(text):
                        return text.strip()
        elif ext in (".flac", ".ogg"):
            tags = FLAC(file_path)
            for field in ("lyrics", "LYRICS", "unsyncedlyrics"):
                val = tags.get(field)
                if val and not _is_junk_embedded(val[0]):
                    return val[0].strip()
    except Exception:
        pass
    return ""


# ── 2. LRC sidecar file ───────────────────────────────

def extract_lrc_file(file_path: str) -> str:
    lrc_path = Path(file_path).with_suffix(".lrc")
    if not lrc_path.exists():
        return ""
    try:
        for encoding in ("utf-8", "utf-8-sig", "latin-1"):
            try:
                with open(lrc_path, "r", encoding=encoding) as f:
                    raw = f.read()
                break
            except UnicodeDecodeError:
                continue
        else:
            return ""

        # Strip timestamps [00:23.45]
        clean = re.sub(r'\[\d+:\d+\.\d+\]', '', raw)
        # Strip LRC metadata [ar:Artist]
        clean = re.sub(r'\[\w+:.*?\]', '', clean)
        lines = [l.strip() for l in clean.splitlines() if l.strip()]
        return "\n".join(lines[:40])
    except Exception:
        return ""


# ── 3. lrclib.net ─────────────────────────────────────

async def fetch_lrclib(title: str, artist: str, duration: int) -> str:
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                "https://lrclib.net/api/search",
                params={"track_name": title, "artist_name": artist},
                timeout=8,
                headers={"User-Agent": "Driftwave/1.0"},
            )
            if r.status_code == 200:
                results = r.json()
                if results:
                    return results[0].get("plainLyrics", "")[:500]
    except Exception:
        pass
    return ""


# ── 4. Genius API ─────────────────────────────────────

async def fetch_genius(title: str, artist: str) -> str:
    token = os.getenv("GENIUS_KEY", "")
    if not token:
        return ""
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                "https://api.genius.com/search",
                params={"q": f"{title} {artist}"},
                headers={"Authorization": f"Bearer {token}"},
                timeout=8,
            )
            if r.status_code != 200:
                return ""
            hits = r.json().get("response", {}).get("hits", [])
            if not hits:
                return ""

            # Scrape the lyrics page
            from bs4 import BeautifulSoup
            song_url = hits[0]["result"]["url"]
            r2 = await client.get(
                song_url,
                timeout=10,
                headers={"User-Agent": "Mozilla/5.0"},
            )
            soup = BeautifulSoup(r2.text, "html.parser")
            containers = soup.find_all("div", attrs={"data-lyrics-container": "true"})
            if containers:
                text = "\n".join(c.get_text("\n") for c in containers)
                return text[:500]
    except Exception:
        pass
    return ""


# ── Waterfall ─────────────────────────────────────────

async def get_lyrics(
    file_path:  str,
    title:      str,
    artist:     str,
    duration:   int,
    lang_hint:  str = "",
) -> tuple[str, str]:
    """
    Returns (lyrics_text, source_name).
    source_name: 'embedded' | 'lrc_file' | 'lrclib' | 'tamil' | 'genius' | 'none'

    lang_hint: pass detected language (e.g. 'tamil') to enable
               language-specific scrapers before the generic Genius fallback.
    """

    # 1. Embedded
    text = extract_embedded_lyrics(file_path)
    if text:
        return (text, "embedded")

    # 2. LRC sidecar
    text = extract_lrc_file(file_path)
    if text:
        return (text, "lrc_file")

    # 3. lrclib
    text = await fetch_lrclib(title, artist, duration)
    if text:
        return (text, "lrclib")

    # 4. Tamil-specific scraper (only when language is known to be Tamil)
    if lang_hint == "tamil":
        from lyrics.tamil import fetch_tamil_lyrics
        text = await fetch_tamil_lyrics(title, artist)
        if text:
            return (text, "tamil")

    # 5. Genius
    text = await fetch_genius(title, artist)
    if text:
        return (text, "genius")

    return ("", "none")
