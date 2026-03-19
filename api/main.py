"""
Driftwave API
FastAPI backend — RAG search, playlist management, Navidrome bridge.
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from qdrant_client.models import TextIndexParams, TokenizerType

from config import settings, TEXT_COLLECTION
from core.retriever import get_qdrant
from routes import search, playlist, library, stream, auth, index

log = logging.getLogger(__name__)

_TEXT_INDEX_FIELDS = [
    "cultural_meta.film_name",
    "cultural_meta.lyricist",
    "cultural_meta.composer",
    "cultural_meta.film_meta.cast",
    "cultural_meta.film_meta.director",
    "artist",
    "lyrics",
]

_FULL_TEXT_INDEX = TextIndexParams(type="text", tokenizer=TokenizerType.WORD, lowercase=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure Qdrant payload indexes exist — safe to call on every startup (idempotent)
    try:
        client = get_qdrant()
        for field in _TEXT_INDEX_FIELDS:
            try:
                client.create_payload_index(
                    collection_name=TEXT_COLLECTION,
                    field_name=field,
                    field_schema=_FULL_TEXT_INDEX,
                )
            except Exception:
                pass  # already exists
        log.info("[startup] Qdrant payload indexes ensured on %s", TEXT_COLLECTION)
    except Exception as exc:
        log.warning("[startup] Could not ensure Qdrant indexes: %s", exc)
    yield


app = FastAPI(
    title="Driftwave API",
    description="AI-powered music discovery for self-hosted libraries",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,     prefix="/auth",     tags=["Auth"])
app.include_router(search.router,   prefix="/search",   tags=["Search"])
app.include_router(playlist.router, prefix="/playlist", tags=["Playlist"])
app.include_router(library.router,  prefix="/library",  tags=["Library"])
app.include_router(stream.router,   prefix="/stream",   tags=["Stream"])
app.include_router(index.router,    prefix="/index",    tags=["Index"])


@app.get("/health")
async def health():
    return {"status": "ok", "service": "driftwave-api"}


@app.get("/")
async def root():
    return {
        "name":    "Driftwave API",
        "version": "1.0.0",
        "docs":    "/docs",
    }
