"""
RAG retriever — dual vector search + Ollama rerank.
Incorporates Deezer Text2Playlist two-stage approach:
  1. Tag extraction from prompt
  2. Filtered vector search
  3. Diversity filter
  4. LLM rerank
"""
import json
from typing import Optional

import httpx
from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue, MatchText, MatchAny, Range
from sentence_transformers import SentenceTransformer
import torch

from config import settings, TEXT_COLLECTION, AUDIO_COLLECTION

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

_text_model: Optional[SentenceTransformer] = None
_qdrant:     Optional[QdrantClient]        = None


def get_text_model():
    global _text_model
    if _text_model is None:
        _text_model = SentenceTransformer("all-MiniLM-L6-v2", device=DEVICE)
    return _text_model


def get_qdrant():
    global _qdrant
    if _qdrant is None:
        _qdrant = QdrantClient(host=settings.QDRANT_HOST, port=settings.QDRANT_PORT)
    return _qdrant


# ── Tag extraction ────────────────────────────────────

TAG_EXTRACTION_PROMPT = """\
You are a music search tag extractor. Extract tags from the user query into JSON.
Use null for any field not mentioned in the query.

Fields:
- mood: string ("happy", "sad", "melancholic", "energetic", "peaceful", etc.) or null
- tempo: "slow" / "moderate" / "fast" or null
- energy: "low" / "medium" / "high" or null
- valence: "happy" / "sad" / "neutral" or null
- time_of_day: string or null
- activity: string or null
- genre_hints: list of genre names or null
- tamil_genre_hints: list from [kuthu, melody, gaana, folk, bgm, devotional, classical] or null
- composer_hints: list of composer/music director names or null  (trigger: "composed by", "music by")
- lyricist_hints: list of lyricist names or null  (trigger: "penned by", "written by", "lyrics by")
- artist_hints: list of SINGER/VOCALIST names only or null  (trigger: "sung by", "voice of", "playback by")
- cast_hints: list of ACTOR/ACTRESS names or null  (trigger: "songs of <actor>", "films of <actress>", "starring")
- film_hints: list of film/movie names or null
- year_from: integer or null  (trigger: decade like "90s"→1990, specific year)
- year_to: integer or null    (trigger: decade like "90s"→1999, specific year)
- duration_min: seconds as integer or null  (trigger: "short songs"→null, "under 3 min"→180)
- duration_max: seconds as integer or null  (trigger: "long songs"→null, "under 3 min"→180)
- key_hint: musical key string or null  (trigger: only when key is explicitly stated)
- is_film_song: true/false/null  (trigger: "film songs"→true, "album songs"→false)
- lyrics_hint: quoted or described lyric phrase or null
- language: language name or null

Examples:

Query: "sad Ilaiyaraaja songs from the 80s"
Output: {{"mood": "sad", "tempo": null, "energy": null, "valence": "sad", "time_of_day": null, "activity": null, "genre_hints": null, "tamil_genre_hints": null, "composer_hints": ["Ilaiyaraaja"], "lyricist_hints": null, "artist_hints": null, "cast_hints": null, "film_hints": null, "year_from": 1980, "year_to": 1989, "duration_min": null, "duration_max": null, "key_hint": null, "is_film_song": null, "lyrics_hint": null, "language": "tamil"}}

Query: "songs of Kajal Aggarwal"
Output: {{"mood": null, "tempo": null, "energy": null, "valence": null, "time_of_day": null, "activity": null, "genre_hints": null, "tamil_genre_hints": null, "composer_hints": null, "lyricist_hints": null, "artist_hints": null, "cast_hints": ["Kajal Aggarwal"], "film_hints": null, "year_from": null, "year_to": null, "duration_min": null, "duration_max": null, "key_hint": null, "is_film_song": null, "lyrics_hint": null, "language": null}}

Query: "penned by Vaali slow melodies"
Output: {{"mood": null, "tempo": "slow", "energy": null, "valence": null, "time_of_day": null, "activity": null, "genre_hints": ["melody"], "tamil_genre_hints": ["melody"], "composer_hints": null, "lyricist_hints": ["Vaali"], "artist_hints": null, "film_hints": null, "year_from": null, "year_to": null, "duration_min": null, "duration_max": null, "key_hint": null, "is_film_song": null, "lyrics_hint": null, "language": "tamil"}}

Now extract tags for this query. Return ONLY the JSON object, no explanation:
Query: "{prompt}"
Output:"""


import logging as _logging
_log = _logging.getLogger(__name__)


async def extract_query_tags(prompt: str) -> dict:
    try:
        async with httpx.AsyncClient() as client:
            r = await client.post(
                f"{settings.OLLAMA_HOST}/api/generate",
                json={
                    "model":   settings.OLLAMA_MODEL,
                    "prompt":  TAG_EXTRACTION_PROMPT.format(prompt=prompt),
                    "stream":  False,
                    "options": {"temperature": 0.1, "num_predict": 350},
                },
                timeout=45,
            )
            resp_json = r.json()
            _log.warning("[tags] full Ollama response: %r", str(resp_json)[:800])
            raw = resp_json.get("response", "").strip()
            # Strip markdown fences if present
            text = raw.replace("```json", "").replace("```", "").strip()
            # Extract first {...} block in case LLM added preamble
            start = text.find("{")
            end   = text.rfind("}") + 1
            if start >= 0 and end > start:
                text = text[start:end]
            return json.loads(text)
    except Exception as exc:
        _log.warning("[tags] parse failed for %r: %s", prompt, exc)
        return {}


# ── Hard filters from tags ────────────────────────────

def build_filters(
    tags:        dict,
    lang_filter: Optional[str]   = None,
    energy_min:  Optional[float] = None,
    tempo_max:   Optional[float] = None,
    valence_min: Optional[float] = None,
) -> list:
    must = []

    # ── Language ──────────────────────────────────────
    if lang_filter:
        must.append(FieldCondition(key="adapter_type", match=MatchValue(value=lang_filter)))
    elif tags.get("language"):
        must.append(FieldCondition(key="adapter_type", match=MatchValue(value=tags["language"].lower())))

    # ── Tempo ─────────────────────────────────────────
    tempo_map = {"slow": (0, 85), "moderate": (85, 120), "fast": (120, 999)}
    tempo_str = tags.get("tempo", "")
    if tempo_str in tempo_map:
        lo, hi = tempo_map[tempo_str]
        must.append(FieldCondition(key="tempo", range=Range(gte=lo, lte=hi)))

    # ── Energy ────────────────────────────────────────
    energy_map = {"low": (0.0, 0.4), "medium": (0.3, 0.7), "high": (0.6, 1.0)}
    energy_str = tags.get("energy", "")
    if energy_str in energy_map:
        lo, hi = energy_map[energy_str]
        must.append(FieldCondition(key="energy", range=Range(gte=lo, lte=hi)))

    # ── Valence (happiness) ───────────────────────────
    valence_map = {"sad": (0.0, 0.35), "neutral": (0.3, 0.65), "happy": (0.6, 1.0)}
    valence_str = tags.get("valence", "")
    if valence_str in valence_map:
        lo, hi = valence_map[valence_str]
        must.append(FieldCondition(key="valence", range=Range(gte=lo, lte=hi)))

    # ── Genre ─────────────────────────────────────────
    genre_hints = tags.get("genre_hints") or []
    if genre_hints:
        must.append(FieldCondition(key="genre", match=MatchAny(any=[g.capitalize() for g in genre_hints])))

    # ── Tamil genre ───────────────────────────────────
    tamil_genre_hints = tags.get("tamil_genre_hints") or []
    if tamil_genre_hints:
        must.append(FieldCondition(
            key="cultural_meta.tamil_genre",
            match=MatchAny(any=[g.lower() for g in tamil_genre_hints]),
        ))

    # ── Composer ──────────────────────────────────────
    for composer in (tags.get("composer_hints") or []):
        if composer:
            must.append(FieldCondition(key="cultural_meta.composer", match=MatchText(text=composer)))

    # ── Lyricist ──────────────────────────────────────
    for lyricist in (tags.get("lyricist_hints") or []):
        if lyricist:
            must.append(FieldCondition(key="cultural_meta.lyricist", match=MatchText(text=lyricist)))

    # ── Artist / vocalist ─────────────────────────────
    for artist in (tags.get("artist_hints") or []):
        if artist:
            must.append(FieldCondition(key="artist", match=MatchText(text=artist)))

    # ── Cast / actor / actress ────────────────────────
    for actor in (tags.get("cast_hints") or []):
        if actor:
            must.append(FieldCondition(
                key="cultural_meta.film_meta.cast",
                match=MatchText(text=actor),
            ))

    # ── Film ──────────────────────────────────────────
    for film in (tags.get("film_hints") or []):
        if film:
            must.append(FieldCondition(key="cultural_meta.film_name", match=MatchText(text=film)))

    # ── Year range — year stored as string, use MatchAny ─
    # Use open-ended defaults: floor=1900, ceiling=current year
    _YEAR_FLOOR   = 1900
    _YEAR_CEILING = 2026
    year_from = tags.get("year_from")
    year_to   = tags.get("year_to")
    if year_from or year_to:
        lo = int(year_from) if year_from else _YEAR_FLOOR
        hi = int(year_to)   if year_to   else _YEAR_CEILING
        year_list = [str(y) for y in range(lo, hi + 1)]
        _log.warning("[filter] year range %d–%d → MatchAny(%d values)", lo, hi, len(year_list))
        must.append(FieldCondition(
            key="year",
            match=MatchAny(any=year_list),
        ))

    # ── Duration ──────────────────────────────────────
    dur_min = tags.get("duration_min")
    dur_max = tags.get("duration_max")
    if dur_min is not None:
        must.append(FieldCondition(key="duration", range=Range(gte=float(dur_min))))
    if dur_max is not None:
        must.append(FieldCondition(key="duration", range=Range(lte=float(dur_max))))

    # ── Musical key ───────────────────────────────────
    key_hint = tags.get("key_hint")
    if key_hint:
        must.append(FieldCondition(key="key", match=MatchValue(value=key_hint)))

    # ── Film song flag ────────────────────────────────
    is_film = tags.get("is_film_song")
    if is_film is not None:
        must.append(FieldCondition(key="cultural_meta.is_film_song", match=MatchValue(value=bool(is_film))))

    # ── Lyrics content ────────────────────────────────
    lyrics_hint = tags.get("lyrics_hint")
    if lyrics_hint:
        must.append(FieldCondition(key="lyrics", match=MatchText(text=lyrics_hint)))

    # ── Explicit slider overrides (frontend) ──────────
    if energy_min is not None:
        must.append(FieldCondition(key="energy",  range=Range(gte=energy_min)))
    if tempo_max is not None:
        must.append(FieldCondition(key="tempo",   range=Range(lte=tempo_max)))
    if valence_min is not None:
        must.append(FieldCondition(key="valence", range=Range(gte=valence_min)))

    return must


# ── Diversity filter ──────────────────────────────────

def apply_diversity(tracks: list[dict], max_per_artist: int = 3) -> list[dict]:
    artist_count: dict[str, int] = {}
    result = []
    for track in tracks:
        artist = track.get("artist", "").lower()
        count  = artist_count.get(artist, 0)
        if count < max_per_artist:
            result.append(track)
            artist_count[artist] = count + 1
    return result


# ── LLM rerank ────────────────────────────────────────

RERANK_PROMPT = """\
You are a music curator. Given a user's mood request and a list of candidate tracks,
return the IDs of the top {n} tracks that best match the mood.
Consider musical coherence, flow, and variety.

User request: "{prompt}"

Candidate tracks (id: title by artist — description):
{candidates}

Return ONLY a JSON array of track IDs in order, e.g. ["id1", "id2", ...].
No explanation."""


async def rerank_with_ollama(
    prompt:     str,
    tracks:     list[dict],
    top_k:      int = 20,
) -> list[dict]:
    if len(tracks) <= top_k:
        return tracks

    candidates = "\n".join([
        f"{t['file_path']}: {t.get('title','?')} by {t.get('artist','?')} — {t.get('description','')[:80]}"
        for t in tracks[:50]
    ])

    try:
        async with httpx.AsyncClient() as client:
            r = await client.post(
                f"{settings.OLLAMA_HOST}/api/generate",
                json={
                    "model":   settings.OLLAMA_MODEL,
                    "prompt":  RERANK_PROMPT.format(
                                   prompt=prompt,
                                   candidates=candidates,
                                   n=top_k,
                               ),
                    "stream":  False,
                    "options": {"temperature": 0.2, "num_predict": 500},
                },
                timeout=90,
            )
            text = r.json().get("response", "").strip()
            text = text.replace("```json", "").replace("```", "").strip()
            ordered_ids: list[str] = json.loads(text)

            track_map = {t["file_path"]: t for t in tracks}
            reranked  = [track_map[id_] for id_ in ordered_ids if id_ in track_map]

            # Append any not in reranked list
            seen = set(ordered_ids)
            for t in tracks:
                if t["file_path"] not in seen:
                    reranked.append(t)

            return reranked[:top_k]
    except Exception:
        return tracks[:top_k]


# ── Main search entrypoint ────────────────────────────

# Minimum cosine similarity to be included in results.
# all-MiniLM-L6-v2 scores: >0.45 = relevant, 0.30–0.45 = loosely related, <0.30 = noise
SCORE_THRESHOLD = 0.30


async def search(
    prompt:      str,
    limit:       int           = 20,
    lang_filter: Optional[str]   = None,
    text_weight: float         = 0.6,
    clap_weight: float         = 0.4,
    energy_min:  Optional[float] = None,
    tempo_max:   Optional[float] = None,
    valence_min: Optional[float] = None,
) -> tuple[dict, list[dict]]:
    """Returns (extracted_tags, tracks)."""
    model  = get_text_model()
    client = get_qdrant()

    # 1. Extract structured tags from prompt
    tags = await extract_query_tags(prompt)

    # 2. Build hard filters
    must = build_filters(tags, lang_filter, energy_min, tempo_max, valence_min)
    qfilter = Filter(must=must) if must else None

    # 3. Text vector search
    # When hard filters are present the query may be generic (e.g. "2000s", "songs from Maari")
    # so lower the score threshold — the filters already constrain relevance.
    threshold = 0.10 if must else SCORE_THRESHOLD
    query_vec = model.encode(prompt, normalize_embeddings=True).tolist()
    text_results = client.search(
        collection_name=TEXT_COLLECTION,
        query_vector=query_vec,
        query_filter=qfilter,
        limit=80,
        score_threshold=threshold,
        with_payload=True,
    )

    if not text_results:
        return tags, []

    # 4. Build scored list
    merged = []
    for r in text_results:
        item = dict(r.payload)
        item["score"] = r.score
        merged.append(item)

    merged.sort(key=lambda x: x["score"], reverse=True)

    # 5. Diversity filter
    diverse = apply_diversity(merged, max_per_artist=3)

    # 6. LLM rerank (only if we have more candidates than requested)
    final = await rerank_with_ollama(prompt, diverse, top_k=limit)

    return tags, final
