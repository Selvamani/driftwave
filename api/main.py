"""
Driftwave API
FastAPI backend — RAG search, playlist management, Navidrome bridge.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes import search, playlist, library, stream, auth, index

app = FastAPI(
    title="Driftwave API",
    description="AI-powered music discovery for self-hosted libraries",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://localhost(:\d+)?",
    allow_credentials=True,
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
