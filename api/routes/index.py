"""Index management routes — trigger scan, view status."""
from fastapi import APIRouter
from qdrant_client import QdrantClient
from config import settings, TEXT_COLLECTION, AUDIO_COLLECTION
from core.suggestions import invalidate_cache as invalidate_suggestions

router = APIRouter()


@router.post("/invalidate-cache")
async def invalidate_cache():
    """Invalidate suggestion cache — called automatically after indexing."""
    invalidate_suggestions()
    return {"status": "ok", "message": "Suggestion cache invalidated"}


@router.get("/status")
async def index_status():
    """Return index stats from Qdrant."""
    try:
        client = QdrantClient(host=settings.QDRANT_HOST, port=settings.QDRANT_PORT)
        text_info  = client.get_collection(TEXT_COLLECTION)
        audio_info = client.get_collection(AUDIO_COLLECTION)
        return {
            "text_collection": {
                "name":   TEXT_COLLECTION,
                "tracks": text_info.points_count,
            },
            "audio_collection": {
                "name":   AUDIO_COLLECTION,
                "tracks": audio_info.points_count,
            },
            "status": "ok",
        }
    except Exception as e:
        return {"status": "error", "detail": str(e)}
