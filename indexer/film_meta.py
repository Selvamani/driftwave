"""
TMDB film metadata lookup for Tamil (and other Indian) film songs.
Fetches director, top cast, and IMDB reference for a given film name.
Results are cached in-memory for the duration of the indexing run.
"""
import logging
from typing import Optional

import httpx

from config import settings

_log   = logging.getLogger(__name__)
_cache: dict[str, dict] = {}   # film_name.lower() → film_meta dict

TMDB_BASE = "https://api.themoviedb.org/3"


async def fetch_film_meta(film_name: str, language: str = "ta", year: str = "") -> dict:
    """
    Return a dict with director, cast (list), imdb_id, imdb_url.
    Returns {} if TMDB_API_KEY is not set or no confident match found.
    Best-effort — never raises.
    """
    if not settings.TMDB_API_KEY or not film_name:
        return {}

    cache_key = film_name.strip().lower()
    if cache_key in _cache:
        return _cache[cache_key]

    try:
        result = await _lookup(film_name, language, year)
        _cache[cache_key] = result
        return result
    except Exception as exc:
        _log.debug("film_meta lookup failed for '%s': %s", film_name, exc)
        _cache[cache_key] = {}
        return {}


# Languages considered "Indian" — accept these as valid matches
_INDIAN_LANGS = {"ta", "te", "ml", "kn", "hi", "bn", "mr", "pa"}


async def _lookup(film_name: str, language: str, year: str) -> dict:
    async with httpx.AsyncClient(timeout=10) as client:
        movie_id = await _search_movie(client, film_name, language, year)
        if not movie_id:
            return {}

        r = await client.get(
            f"{TMDB_BASE}/movie/{movie_id}",
            params={
                "api_key":            settings.TMDB_API_KEY,
                "language":           "en-US",
                "append_to_response": "credits,external_ids",
            },
        )
        r.raise_for_status()
        data = r.json()

    crew      = data.get("credits", {}).get("crew", [])
    director  = next((c["name"] for c in crew if c.get("job") == "Director"), "")
    cast_list = data.get("credits", {}).get("cast", [])
    cast      = [c["name"] for c in sorted(cast_list, key=lambda x: x.get("order", 999))[:4]]
    imdb_id   = data.get("external_ids", {}).get("imdb_id", "")

    return {
        "director": director,
        "cast":     cast,
        "imdb_id":  imdb_id,
        "imdb_url": f"https://www.imdb.com/title/{imdb_id}/" if imdb_id else "",
    }


async def _search_movie(
    client:    httpx.AsyncClient,
    film_name: str,
    language:  str,
    year:      str,
) -> Optional[int]:
    params: dict = {"api_key": settings.TMDB_API_KEY, "query": film_name, "region": "IN"}
    if year and year.isdigit():
        params["year"] = year

    r = await client.get(f"{TMDB_BASE}/search/movie", params=params)
    r.raise_for_status()
    results = r.json().get("results", [])
    if not results:
        return None

    film_lower = film_name.strip().lower()

    # Priority 1: exact title + correct language
    for movie in results:
        title_match = (
            movie.get("title", "").lower() == film_lower
            or movie.get("original_title", "").lower() == film_lower
        )
        if title_match and movie.get("original_language") in _INDIAN_LANGS:
            return movie["id"]

    # Priority 2: exact title match regardless of language
    for movie in results:
        if (movie.get("title", "").lower() == film_lower
                or movie.get("original_title", "").lower() == film_lower):
            return movie["id"]

    # Priority 3: first result with correct language — only if it's a strong candidate
    for movie in results[:3]:
        if movie.get("original_language") in _INDIAN_LANGS:
            return movie["id"]

    # No confident match — return nothing rather than a wrong film
    _log.debug("film_meta: no confident TMDB match for '%s'", film_name)
    return None
