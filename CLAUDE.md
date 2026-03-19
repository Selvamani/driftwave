# Driftwave — Claude Code Guide

Self-hosted, AI-powered music player with natural language playlist discovery. Built for multilingual libraries (Tamil, Hindi, Korean, Arabic, Telugu, and more).

## Project Structure

```
driftwave/
├── indexer/        # Python — scans music files, builds vector embeddings
│   ├── adapters/   # Culture-specific language adapters (Tamil, Hindi, Korean, Arabic, Telugu, Default)
│   ├── lyrics/     # Lyrics fetcher waterfall
│   └── tests/
├── api/            # FastAPI — RAG engine, REST API, Subsonic bridge
│   ├── routes/     # API endpoints
│   ├── core/       # RAG, retriever, Navidrome client
│   └── tests/
├── frontend/       # React + Vite — web playlist builder + Tauri desktop wrapper
│   ├── src/
│   │   ├── themes/   # 6 color themes (ocean, aurora, sunset, midnight, sakura, paper)
│   │   ├── pages/    # Discover, Library, Playlists, NowPlaying, Settings, Setup
│   │   ├── hooks/    # usePlayerStore (Zustand), useDiscoverStore (Zustand, persistent)
│   │   └── services/ # config.js — runtime server URL via localStorage
│   └── src-tauri/  # Tauri v2 desktop wrapper (Rust scaffold + capabilities)
├── mobile/         # Flutter — iOS + Android client
│   └── lib/
│       ├── themes/
│       ├── features/ # Auth, Discover, Library, Player, Settings
│       └── services/ # API + Subsonic clients (fetchTrackMeta for Qdrant enrichment)
├── docker-compose.yml
└── Makefile
```

## Services & Ports

| Service    | Tech          | Port  | Purpose                        |
|------------|---------------|-------|--------------------------------|
| navidrome  | Go            | 4533  | Music server + Subsonic API    |
| qdrant     | Rust          | 6333  | Vector database (dual collections) |
| ollama     | Go            | 11434 | Local LLM (default: gemma2:9b) |
| api        | FastAPI       | 8000  | RAG engine + REST API          |
| indexer    | Python        | —     | One-shot + watch mode indexer  |
| redis      | Redis         | 6379  | Job queue (RQ)                 |
| postgres   | PostgreSQL    | 5432  | Metadata + job history         |
| frontend   | React         | 3000  | Web UI                         |
| mobile     | Flutter       | —     | iOS + Android                  |

## Python Environment

Both `api` and `indexer` use **Python 3.11** (`python:3.11-slim` Docker base image).

- `torch` pinned to `2.5.0` — minimum version available on PyPI for Python 3.11 on this platform. Do not downgrade below 2.5.0.
- `fasttext-wheel` requires Python `<3.13` — do not upgrade the base image to Python 3.12+ without verifying this package.
- `transformers` pinned to `4.44.0` to match torch 2.5.x.
- `click` pinned to `8.1.8` — Typer 0.12.3 is incompatible with Click 8.2.0+ (raises "Secondary flag is not valid for non-boolean flag").
- `pyacoustid` is the correct PyPI package name — not `acoustid`. The package provides AcoustID fingerprinting support.
- `CUDA_VISIBLE_DEVICES: ""` is set for the indexer in docker-compose to force CPU mode. The torch CPU wheel does not contain CUDA kernels matching the host GPU, causing "no kernel image" errors if CUDA is enabled.

## Key Commands

```bash
make up           # Start all services
make down         # Stop all services
make index        # Full library scan
make watch        # Watch mode (auto-index new files)
make reset-index  # Clear Qdrant + re-index
make test         # Run all Python tests
make lint         # Lint Python (ruff) + Dart
make logs         # Tail all logs
make status       # Show service status
make clean        # Remove containers (keep volumes)
make clean-all    # Remove everything including volumes (destructive)
```

## Development

### API (local hot reload)
```bash
cd api && pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend && npm install && npm run dev
```

### Tests
```bash
cd api && python -m pytest tests/ -v
cd indexer && python -m pytest tests/ -v
```

### Linting
```bash
cd api && ruff check .
cd indexer && ruff check .
cd mobile && dart analyze
```

## Docker Notes

- The `version` field in `docker-compose.yml` is obsolete — Docker Compose ignores it but warns. Leave it or remove it.
- Docker BuildKit caches build contexts aggressively. If `requirements.txt` changes aren't picked up, run:
  ```bash
  docker builder prune -f && docker compose build --no-cache <service>
  ```
- On WSL2 + Docker Desktop, stale context cache is common. Use `DOCKER_BUILDKIT=0` as a fallback to force the legacy builder.

## Adding a Language Adapter

Implement `BaseAdapter` in `indexer/adapters/` and register it in the adapter registry. Each adapter handles language detection, composer/artist enrichment, and genre tagging for its cultural domain.

## Tauri Desktop

The frontend can run as a native desktop app (Windows / macOS / Linux) via Tauri v2.

- Entry point: `frontend/src-tauri/`
- Dev: `cd frontend && npm run tauri:dev`
- Build: `cd frontend && npm run tauri:build`
- On first launch (no localStorage URL set), app shows `SetupPage` to configure API + Navidrome URLs
- Runtime URL config stored in `localStorage` keys `dw_api_url` / `dw_navidrome_url`
- `isTauri()` in `services/config.js` detects `__TAURI_INTERNALS__` in window
- Windows build requires: Rust (rustup), VS Build Tools (C++ workload), Node.js

## Library Track Enrichment

Navidrome's Subsonic API does not return Qdrant-enriched fields (composer, lyricist, film info, audio features). These are fetched separately:

- **Endpoint**: `GET /library/track-meta?subsonic_id=<id>`
- **Returns**: `cultural_meta` (composer, lyricist, film_meta), `adapter_type`, `tempo`, `energy`, `valence`
- **Web**: auto-fetched in `NowPlayingSidebar` on track change (skips if already present)
- **Flutter**: auto-fetched in `PlayerNotifier._fetchEnrichment()` on `playTrack`/`next`
- Use `mergeCurrentTrackMeta()` (web Zustand) / `mergeTrackMeta()` (Flutter Riverpod) to patch enrichment into the current track state

## Discover Page State

Discover page state (prompt, filters, results) is stored in `useDiscoverStore` (Zustand) — not local `useState`. This preserves state when navigating away and back. Do not revert to local state.

## Subsonic API Key Normalization

Navidrome's `search3` response returns singular keys (`artist`, `album`, `song`). The `/library/search` route normalises these to plural (`artists`, `albums`, `songs`) before returning to the frontend. Both web and Flutter expect plural keys.

## Themes

Six themes ship for both web and mobile: `ocean`, `aurora`, `sunset`, `midnight`, `sakura`, `paper`.
- Web: Settings → Appearance
- Mobile: Settings → Theme

## CORS

The API (`api/main.py`) uses `allow_origins=["*"]` with `allow_credentials=False`. Open CORS — any origin can call the API. Do not set `allow_credentials=True` with a wildcard origin; browsers block it.

## RAG Search — Tag Extraction

`api/core/retriever.py` contains `TAG_EXTRACTION_PROMPT` which the LLM uses to extract structured hints from natural language queries. Key points:

- **13 hint types** including `director_hints` (added for "maniratnam songs"-style queries)
- The prompt includes **name expansion rules** for colloquial South Indian names:
  - "rajini" → Rajinikanth (`cast_hints`)
  - "maniratnam" → Mani Ratnam (`director_hints`)
  - "arr" → A.R. Rahman (`composer_hints`)
  - "anirudh" → Anirudh Ravichander, etc.
- When adding a new hint type: add it to `TAG_EXTRACTION_PROMPT`, add a filter in `build_filters()`, and add a Qdrant payload index in `indexer/embedder.py` `_TEXT_INDEX_FIELDS` or `_KEYWORD_INDEX_FIELDS`.
- `MatchText` requires a `TextIndexParams` index — without it Qdrant silently ignores the filter.
- Score threshold drops to `0.10` (from `0.30`) when hard filters are present, since filters already constrain relevance.

## Search Performance

Current search takes 3–6 s due to two sequential Ollama calls. Do not add more Ollama calls to the hot path. Planned fixes (not yet implemented — see SystemDesign.md §10 Performance):
1. Skip LLM rerank when hard filters are active (cast/director/composer/film) — saves 2–4 s
2. Parallel tag extraction + broad vector search — hides 1–2 s of LLM latency
3. Prompt LRU cache — free win for repeat searches
4. Score-boost reranking to replace second Ollama call entirely
5. Smaller model (gemma2:2b) for tag extraction only
