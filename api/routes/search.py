"""Search routes — RAG query endpoint."""
from typing import Optional
from fastapi import APIRouter, Query
from pydantic import BaseModel

from core.retriever import search as rag_search, extract_query_tags
from core.suggestions import suggest as get_suggestions

router = APIRouter()


class SearchRequest(BaseModel):
    prompt:               str
    limit:                int            = 20
    lang_filter:          Optional[str]  = None
    text_weight:          float          = 0.6
    clap_weight:          float          = 0.4
    energy_min:           Optional[float] = None   # 0.0–1.0
    tempo_max:            Optional[float] = None   # BPM
    valence_min:          Optional[float] = None   # 0.0–1.0
    duration_limit_secs:  Optional[int]  = None    # total playlist length cap


class SearchResponse(BaseModel):
    tracks:         list[dict]
    prompt:         str
    count:          int
    total_duration: int  = 0   # seconds
    extracted_tags: dict = {}


def _cap_by_duration(tracks: list[dict], limit_secs: int) -> list[dict]:
    """Return tracks in order until their cumulative duration hits the cap."""
    result, total = [], 0
    for t in tracks:
        dur = t.get("duration") or 0
        if total + dur > limit_secs:
            break
        result.append(t)
        total += dur
    return result


@router.post("", response_model=SearchResponse)
async def search(req: SearchRequest):
    """
    Natural language music search.
    Example: {"prompt": "melancholic AR Rahman late night slow"}
    """
    # Fetch more candidates when a duration cap is active so we fill the window well
    fetch_limit = req.limit if req.duration_limit_secs is None else max(req.limit, 200)

    tags, tracks = await rag_search(
        prompt=req.prompt,
        limit=fetch_limit,
        lang_filter=req.lang_filter,
        text_weight=req.text_weight,
        clap_weight=req.clap_weight,
        energy_min=req.energy_min,
        tempo_max=req.tempo_max,
        valence_min=req.valence_min,
    )

    if req.duration_limit_secs is not None:
        tracks = _cap_by_duration(tracks, req.duration_limit_secs)

    total_duration = sum(t.get("duration") or 0 for t in tracks)
    return SearchResponse(
        tracks=tracks,
        prompt=req.prompt,
        count=len(tracks),
        total_duration=total_duration,
        extracted_tags=tags,
    )


@router.get("/suggest")
async def suggest(q: str = Query(..., min_length=2, description="Partial query for autocomplete")):
    """Return name/film suggestions for the given partial query."""
    results = await get_suggestions(q)
    return {"suggestions": results, "query": q}


@router.get("/debug/tags")
async def debug_tags(q: str = Query(...)):
    """Show what tags the LLM extracts from a query — useful for diagnosing search issues."""
    tags = await extract_query_tags(q)
    return {"prompt": q, "extracted_tags": tags}


@router.get("/quick")
async def quick_search(
    q:    str = Query(..., description="Search query"),
    limit: int = Query(20, description="Max results"),
    lang:  Optional[str] = Query(None, description="Filter by language adapter"),
):
    """Quick GET search endpoint for simple queries."""
    tags, tracks = await rag_search(prompt=q, limit=limit, lang_filter=lang)
    return {"tracks": tracks, "count": len(tracks), "extracted_tags": tags}
