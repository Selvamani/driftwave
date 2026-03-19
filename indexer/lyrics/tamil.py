"""
Tamil lyrics scraper — waterfall over Tamil-specific sites.

Strategy:
  1. tamilpaa.com  — large database, search + scrape
  2. paadalgal.com — fallback scraper
  3. tamiltunes.com — final fallback

All functions return "" on any failure (best-effort, never raises).
"""
import re
import urllib.parse
from typing import Optional

import httpx
from bs4 import BeautifulSoup

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "ta,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

_TIMEOUT = 10


_CREDIT_RE = re.compile(
    r"^(music|lyrics|lyric|singer|singers|vocal|starring|composed|composer|"
    r"lyricist|written|director|producer|label|music by|lyrics by|sung by|"
    r"starring|cast|from the film|from the movie)\b",
    re.I,
)

def _clean_lyrics(text: str) -> str:
    """Strip HTML artifacts, credits, and collapse whitespace."""
    # Remove HTML tags if any slipped through
    text = re.sub(r"<[^>]+>", "", text)
    # Collapse multiple blank lines
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Strip leading/trailing whitespace per line
    lines = [l.strip() for l in text.splitlines()]
    # Drop navigation noise
    noise = {"home", "search", "contact", "share", "lyrics", "songs", "albums"}
    # Drop credit lines (e.g. "Music: Anirudh", "Lyricist: Dhanush")
    lines = [
        l for l in lines
        if l
        and l.lower() not in noise
        and len(l) > 1
        and not _CREDIT_RE.match(l)
        and ":" not in l[:30]   # "Singer : Vineeth" style credits
    ]
    return "\n".join(lines).strip()


# ── 1. tamilpaa.com ───────────────────────────────────

async def _tamilpaa(title: str, artist: str, client: httpx.AsyncClient) -> str:
    """
    tamilpaa.com search → song page → lyrics.
    URL: https://www.tamilpaa.com/search.php?q={query}
    """
    query = f"{title} {artist}".strip()
    search_url = f"https://www.tamilpaa.com/search.php?q={urllib.parse.quote(query)}"

    try:
        r = await client.get(search_url, headers=_HEADERS, timeout=_TIMEOUT,
                             follow_redirects=True)
        if r.status_code != 200:
            return ""

        soup = BeautifulSoup(r.text, "html.parser")

        # Find first song link — tamilpaa uses /song/ or /lyrics/ paths
        link = None
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if "/song/" in href or "/lyrics/" in href:
                link = href if href.startswith("http") else f"https://www.tamilpaa.com{href}"
                break

        if not link:
            return ""

        r2 = await client.get(link, headers=_HEADERS, timeout=_TIMEOUT,
                               follow_redirects=True)
        if r2.status_code != 200:
            return ""

        soup2 = BeautifulSoup(r2.text, "html.parser")

        # Try common lyrics container selectors
        for selector in [
            {"class": re.compile(r"lyric", re.I)},
            {"id":    re.compile(r"lyric", re.I)},
            {"class": re.compile(r"song.?content", re.I)},
            {"class": "entry-content"},
        ]:
            container = soup2.find(["div", "p", "article"], attrs=selector)
            if container:
                text = container.get_text("\n")
                cleaned = _clean_lyrics(text)
                if len(cleaned) > 50:
                    return cleaned[:1500]

    except Exception:
        pass
    return ""


# ── 2. paadalgal.com ─────────────────────────────────

async def _paadalgal(title: str, artist: str, client: httpx.AsyncClient) -> str:
    """
    paadalgal.com — search via Google-style URL params.
    URL: https://www.paadalgal.com/?s={query}
    """
    query = f"{title} {artist}".strip()
    search_url = f"https://www.paadalgal.com/?s={urllib.parse.quote(query)}"

    try:
        r = await client.get(search_url, headers=_HEADERS, timeout=_TIMEOUT,
                             follow_redirects=True)
        if r.status_code != 200:
            return ""

        soup = BeautifulSoup(r.text, "html.parser")

        # Find first article/post link
        link = None
        for a in soup.select("h2 a, h3 a, .entry-title a"):
            href = a.get("href", "")
            if href and "paadalgal.com" in href:
                link = href
                break

        if not link:
            return ""

        r2 = await client.get(link, headers=_HEADERS, timeout=_TIMEOUT,
                               follow_redirects=True)
        if r2.status_code != 200:
            return ""

        soup2 = BeautifulSoup(r2.text, "html.parser")
        container = soup2.find("div", class_=re.compile(r"entry.?content|post.?content", re.I))
        if container:
            text = container.get_text("\n")
            cleaned = _clean_lyrics(text)
            if len(cleaned) > 50:
                return cleaned[:1500]

    except Exception:
        pass
    return ""


# ── 3. tamiltunes.com ─────────────────────────────────

async def _tamiltunes(title: str, artist: str, client: httpx.AsyncClient) -> str:
    """
    tamiltunes.com — search endpoint.
    URL: https://www.tamiltunes.com/search/{query}/
    """
    query_slug = re.sub(r"[^\w\s-]", "", f"{title} {artist}").strip().replace(" ", "+")
    search_url = f"https://www.tamiltunes.com/search/{urllib.parse.quote(query_slug)}/"

    try:
        r = await client.get(search_url, headers=_HEADERS, timeout=_TIMEOUT,
                             follow_redirects=True)
        if r.status_code != 200:
            return ""

        soup = BeautifulSoup(r.text, "html.parser")

        link = None
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if "/lyrics/" in href and "tamiltunes.com" in href:
                link = href
                break

        if not link:
            return ""

        r2 = await client.get(link, headers=_HEADERS, timeout=_TIMEOUT,
                               follow_redirects=True)
        if r2.status_code != 200:
            return ""

        soup2 = BeautifulSoup(r2.text, "html.parser")
        container = soup2.find("div", class_=re.compile(r"lyric|content|song", re.I))
        if container:
            text = container.get_text("\n")
            cleaned = _clean_lyrics(text)
            if len(cleaned) > 50:
                return cleaned[:1500]

    except Exception:
        pass
    return ""


# ── Public entry point ────────────────────────────────

async def fetch_tamil_lyrics(title: str, artist: str) -> str:
    """
    Try Tamil lyrics sites in order. Returns first non-empty result
    (truncated to 600 chars for embedding, same as other sources).
    Returns "" if all sources fail.
    """
    async with httpx.AsyncClient() as client:
        text = await _tamilpaa(title, artist, client)
        if text:
            return text

        text = await _paadalgal(title, artist, client)
        if text:
            return text

        text = await _tamiltunes(title, artist, client)
        if text:
            return text

    return ""
