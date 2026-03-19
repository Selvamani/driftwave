# 〜 Driftwave

> **Self-hosted, AI-powered music player with natural language playlist discovery.**
> Built for multilingual libraries — Tamil, Hindi, Korean, Arabic, Telugu, and beyond.

[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.11-blue)](indexer/)
[![Flutter](https://img.shields.io/badge/flutter-3.x-blue)](mobile/)
[![Docker](https://img.shields.io/badge/docker-compose-blue)](docker-compose.yml)

---

## What is Driftwave?

Driftwave lets you search your personal music library the way you actually think about music — not by browsing folders, but by describing what you want:

> *"melancholic AR Rahman, late night, slow tempo"*
> *"high energy kuthu for a party"*
> *"rainy day Hindi 90s ballads"*
> *"songs from Maari"*
> *"penned by Vaali, before 1995"*
> *"songs featuring Kajal Aggarwal"*

It understands the cultural context of your music — composer signatures, film origins, lyricists, regional genres — and builds playlists accordingly. **100% self-hosted, no subscriptions, works offline.**

For full architecture details, see [SystemDesign.md](SystemDesign.md).

---

## How It Works

```
Music Files
    │
    ▼
Indexer ──── Language Detection ──────── Culture Adapter
    │         Unicode · Artist DB                │
    │         Path hints · fasttext         Tamil / Hindi
    │         AcoustID fingerprint          Korean / Arabic
    │                                       Telugu / Default
    │
    ├── ID3 tags + site-noise cleaning
    ├── TMDB film metadata (director, cast, IMDb)
    ├── Lyrics waterfall (embedded → lrclib → Genius)
    ├── Audio features (tempo · energy · valence · key)
    ├── AI description (Ollama Gemma2:9b)
    ├── CLAP audio embedding (512-dim, GPU)
    └── Text embedding (all-MiniLM-L6-v2, 384-dim)
              │
              ▼
         Qdrant Vector DB  (dual collections)
              │
              ▼
         FastAPI (RAG engine)
         ┌────────────────────────────────────────────┐
         │  User query                                 │
         │  → Ollama extracts 12 hint types            │
         │    (composer, film, cast, year, genre…)     │
         │  → Qdrant filters + dual vector search      │
         │  → Duration or count limit                  │
         │  → Ranked tracks with film info + IMDb      │
         └────────────────────────────────────────────┘
              │
    ┌─────────┴──────────┐
    │                    │
React Web           Flutter Mobile
 :3000               iOS + Android
```

---

## Key Features

**Natural language search**
Ask for moods, eras, composers, films, lyricists, or actors. The LLM extracts structured hints and builds precise Qdrant filters.

**Multilingual-first**
Culture-aware adapters handle Tamil, Hindi, Korean, Arabic, Telugu, Malayalam, Japanese, and more. Each adapter knows its genre taxonomy, composer signatures, and naming conventions.

**Film song intelligence**
TMDB integration enriches film songs with director, top cast, and IMDb links — shown in the UI and searchable ("songs featuring Dhanush", "directed by Mani Ratnam").

**Dual-vector retrieval**
Text embeddings carry cultural context and lyrics meaning. CLAP audio embeddings handle zero-tag files by sonic similarity. Both are merged at query time.

**Duration-aware playlists**
Limit results by total playlist duration (e.g., "give me 300 minutes of 90s melodies") or by count. Mutually exclusive in the UI.

**Toggle-enabled mood sliders**
Energy, tempo, and valence sliders are opt-in — only active when you turn them on. Collapsible filter panel keeps the UI clean.

**Lyrics view**
Read synced lyrics for any track directly in the web app.

**6 themes**
`ocean` · `aurora` · `sunset` · `midnight` · `sakura` · `paper` — web and mobile.

---

## Services

| Service | Technology | Port | Purpose |
|---|---|---|---|
| `navidrome` | Go | 4533 | Music server + Subsonic API |
| `qdrant` | Rust | 6333 | Vector database (dual collections) |
| `ollama` | Go | 11434 | Local LLM — Gemma2:9b, auto-pulled on startup |
| `api` | FastAPI | 8000 | RAG engine + REST API |
| `indexer` | Python | — | One-shot + watch mode indexer |
| `redis` | Redis | 6379 | Job queue (RQ) |
| `postgres` | PostgreSQL | 5432 | Metadata + job history |
| `frontend` | React + Vite | 3000 | Web playlist builder |
| `mobile` | Flutter | — | iOS + Android client |

---

## Quick Start

### Prerequisites

- Docker + Docker Compose
- NVIDIA GPU with CUDA 12+ (recommended — CPU fallback works)
- [nvidia-container-toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html) for GPU passthrough
- 16 GB RAM minimum (8 GB workable without GPU)
- TMDB API key (free) for film metadata

### 1. Clone

```bash
git clone https://github.com/yourusername/driftwave.git
cd driftwave
```

### 2. Configure

```bash
cp .env.example .env
# Set: MUSIC_DIR, NAVIDROME_USER, NAVIDROME_PASS, TMDB_API_KEY
```

### 3. Start

```bash
make up
# Ollama pulls gemma2:9b automatically on first start
```

### 4. Index your library

```bash
make index       # Full scan
make watch       # Watch mode — auto-indexes new files
```

### 5. Open

- Web app: http://localhost:3000
- Navidrome: http://localhost:4533
- API docs: http://localhost:8000/docs

---

## Language Adapters

| Adapter | Language | What it knows |
|---|---|---|
| `TamilAdapter` | Tamil | Composer vibes · film/TMDB context · Kuthu/Melody/Gaana · site-noise cleaning |
| `HindiAdapter` | Hindi | Bollywood era · lyricist context · 50s–present mapping |
| `KoreanAdapter` | Korean | K-pop concepts · idol groups · Trot/ballad/hip-hop |
| `ArabicAdapter` | Arabic | Maqam scale · regional variants · Khaleeji/Egyptian |
| `TeluguAdapter` | Telugu | Tollywood composers · folk vs filmi |
| `DefaultAdapter` | Everything else | Western genre taxonomy · CLAP fallback |

Implement `BaseAdapter` in `indexer/adapters/` to add your own.

---

## Makefile

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
make clean-all    # Remove everything including volumes
```

---

## Project Structure

```
driftwave/
├── indexer/          # Python indexer service
│   ├── adapters/     # Language culture adapters
│   ├── lyrics/       # Lyrics fetcher waterfall
│   └── tests/
├── api/              # FastAPI backend
│   ├── routes/       # Endpoints
│   ├── core/         # RAG engine, retriever, Navidrome client
│   └── tests/
├── frontend/         # React + Vite web app
│   └── src/
│       ├── themes/   # 6 color themes
│       ├── pages/    # Discover, Library, Playlists
│       └── services/ # API clients
├── mobile/           # Flutter iOS + Android
│   └── lib/
│       ├── themes/
│       ├── features/ # Auth, Discover, Library, Player
│       └── services/ # API + Subsonic clients
├── SystemDesign.md   # Full architecture reference
└── docker-compose.yml
```

---

## License

MIT © Driftwave Contributors
