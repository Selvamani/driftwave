# Driftwave — System Design

> v1.2 — updated to reflect all implemented changes + next steps

---

## Legend

| Color | Layer |
|---|---|
| 🟠 Orange | Indexer |
| 🟣 Indigo | Vector / AI |
| 🔵 Blue | API |
| 🟢 Green | Navidrome |
| 🟡 Amber | Web Frontend |
| 🌸 Rose | Mobile |
| 🟤 Violet | Adapters |

---

## 01 — Indexer Pipeline

**One-shot (`--scan`) and Watch Mode (`--watch`)**

```
Music Files (/music)
  mp3 · flac · ogg
       │
       ▼
  Lang Detector
  ┌─────────────────────────────────────────────────────────┐
  │ 1. Unicode script    (Tamil/Devanagari/Hangul/Arabic)   │  ~99%
  │ 2. Artist/composer knowledge DB  (AR Rahman, BTS …)    │  ~95%
  │ 3. Folder/path hints  (/Tamil Songs/, /Bollywood/ …)   │  ~90%
  │ 4. Lyrics · fasttext lid.176  (conf threshold 0.6)     │  ~85%
  │ 5. AcoustID fingerprint → MusicBrainz  (untagged files)│  ~70%
  └─────────────────────────────────────────────────────────┘
       │
       ▼
  Lang Adapter  (Tamil / Hindi / Korean / Arabic / Telugu / Default)
       │
       ├── ID3 Extractor (mutagen)
       │     title · artist · composer · film · USLT lyrics
       │
       ├── Site-Noise Normalizer                              ← NEW
       │     Strips "(StarMusiQ.Com)", "01-03 - " prefixes
       │     from genre tags, filenames, and ID3 fields
       │
       ├── TMDB Film Enricher                                 ← NEW
       │     film_name + year → TMDB API
       │     → director, top-4 cast, imdb_id, imdb_url
       │     stored under cultural_meta.film_meta
       │     filter: original_language in Indian lang set
       │
       ├── Audio Analyzer (librosa · 30s · 4 CPU workers)
       │     tempo · energy · valence · key
       │
       ├── Lyrics Waterfall
       │     embedded USLT → .lrc file → lrclib → Genius → scrape
       │
       ├── AI Describer (Ollama · Gemma2:9b · GPU)
       │     Tamil-aware · composer signatures · template fallback
       │
       ├── CLAP Embedder  (DCLAP · 512-dim · GPU)
       │     30s raw audio waveform → audio vector
       │
       └── Text Embedder  (all-MiniLM-L6-v2 · 384-dim · GPU)
             title + artist + composer + genre + mood + description + lyrics
             → text vector
                  │
                  ▼
             Qdrant (dual collections + payload indexes)
```

### Timing — 4060 Ti · 1000 songs

| Stage | Time | Notes |
|---|---|---|
| librosa audio analysis | ~5 min | 4 CPU workers |
| Ollama description | ~15 min | Gemma2:9b GPU |
| CLAP embedding | ~3 min | DCLAP GPU |
| Lyrics fetch | ~2 min | local-first |
| **Total** | **~25 min** | one-time run |

---

## 02 — Language Adapter System

Each adapter implements `BaseAdapter` and is registered in the adapter registry.

### Detection Pipeline (ordered by confidence)

| Priority | Method | Confidence |
|---|---|---|
| 01 | Unicode script detection (Tamil · Devanagari · Hangul · Arabic · CJK) | ~99% |
| 02 | Artist / composer knowledge DB (AR Rahman, Yuvan, BTS …) | ~95% |
| 03 | Folder / path hints (/Tamil Songs/, /Bollywood/ …) | ~90% |
| 04 | Lyrics · fasttext lid.176 (conf threshold 0.6) | ~85% |
| 05 | AcoustID fingerprint → MusicBrainz (untagged files) | ~70% |

### Adapter Registry

| Flag | Language | Specialisation |
|---|---|---|
| 🎵 | **Tamil** | Composer signatures · film context · Kuthu/Melody/Gaana · Carnatic · TMDB enrichment |
| 🎬 | **Hindi** | Bollywood era detection · lyricist context · 50s–present mapping |
| 🌸 | **Korean** | K-pop concept tags · idol group detection · Trot/ballad/hip-hop |
| 🎸 | **Arabic** | Maqam scale · regional variants · Khaleeji/Egyptian |
| 🪗 | **Telugu** | Tollywood composers · Devi Sri Prasad / SS Thaman · folk vs filmi |
| 🌺 | **Malayalam** | Mollywood · Gopi Sundar · Kerala folk · devotional |
| 🎷 | **Japanese** | J-pop / city pop · anime OST · visual kei · enka |
| 🎻 | **Western** | Genre taxonomy · decade mapping · label/scene tags |
| 🌐 | **Default** | Universal fallback — generic template + CLAP audio weight |

> Add your own: implement `BaseAdapter` in `indexer/adapters/` and call `AdapterRegistry.register()`.

### Genre Noise Cleaning (NEW)

Both Tamil and Default adapters strip site-noise injected into ID3 genre tags:

```
StarMusiQ.Com · Masstamilan · Isaimini · Kuttyweb
Tamilwire · Tamiltunes · 123musiq …
```

If genre contains noise → field is cleared; genre re-detected from audio features.

---

## 03 — RAG Query Flow

**Runtime — every search request**

```
Step 01  User Prompt
         "melancholic AR Rahman 90s slow"
         natural language or mood sliders

Step 02  Tag Extraction  (Ollama · Gemma2:9b)
         13 hint types extracted:
         ┌────────────────────────────────────────────────────┐
         │ composer_hints  film_hints     year_from / year_to │
         │ artist_hints    cast_hints     genre_hints         │
         │ director_hints  tamil_genre_hints  valence         │
         │ duration_min / duration_max    key_hint            │
         │ lyrics_hint    is_film_song                        │
         └────────────────────────────────────────────────────┘
         Name expansion: "rajini" → Rajinikanth · "maniratnam" → Mani Ratnam
                         "arr" → A.R. Rahman · "anirudh" → Anirudh Ravichander

Step 03  Build Qdrant Filters
         MatchText → film_name · lyricist · composer · cast · director · lyrics · artist
         MatchAny  → year (string field, range expanded to list)
                     genre · tamil_genre · adapter_type
         Range     → tempo · energy · valence · duration
         Threshold → 0.35 normally · 0.10 when hard filters present

Step 04  Dual Vector Search  (parallel)
         Path A: text RAG (Qdrant · 384-dim)
         Path B: CLAP audio search (Qdrant · 512-dim)

Step 05  Merge + Score
         final_score = 0.6 × text_score + 0.4 × CLAP_score
         (Tamil: 0.7/0.3 · Unknown lang: 0.3/0.7)

Step 06  Duration Limit  (optional)                           ← NEW
         Accumulate track durations in score order
         Stop when total exceeds duration_limit

Step 07  Count Limit  (optional, disabled if duration active)
         Hard cap on returned track count

Step 08  Return to Client
         JSON: { tracks, extracted_tags, count, prompt }
         Film tracks include: director · cast · imdb_url
```

### API Endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/search` | Prompt → tag extract → dual search → ranked tracks |
| `POST` | `/playlist/generate` | Prompt + mood filters → playlist object |
| `POST` | `/playlist/push` | Create playlist in Navidrome via Subsonic API |
| `GET` | `/stream/{id}` | Proxy audio stream from Navidrome |
| `GET` | `/library/*` | Artists · albums · tracks · search |
| `GET` | `/library/lyrics?path=` | Return lyrics for a track |
| `GET` | `/search/debug/tags?q=` | Raw LLM tag extraction (debug) |

---

## 04 — Qdrant Schema

### Payload Indexes

Two index types are created at `init_collections()`:

| Type | Fields |
|---|---|
| `TextIndexParams` (word tokenizer) | `cultural_meta.film_name` · `cultural_meta.lyricist` · `cultural_meta.composer` · `cultural_meta.film_meta.cast` · `cultural_meta.film_meta.director` · `artist` · `lyrics` |
| `KEYWORD` | `adapter_type` · `year` · `genre` · `key` · `cultural_meta.tamil_genre` |

> `MatchText` requires a TextIndexParams index — without it Qdrant silently ignores the filter.

### Document Schema (per track)

```jsonc
{
  "id": "md5(file_path)",

  // Universal fields
  "title":        "Munbe Vaa",
  "artist":       "Shreya Ghoshal",
  "album":        "Sillunu Oru Kaadhal",
  "year":         "2006",              // stored as string for MatchAny
  "duration":     312,                 // seconds (int)
  "genre":        "Melody",
  "subsonic_id":  "navidrome-track-id",
  "mbid":         "uuid-from-musicbrainz",

  // Audio features
  "tempo":    68.4,
  "energy":   0.31,
  "valence":  0.62,
  "key":      "D major",

  // Adapter metadata
  "adapter_type": "tamil",
  "language":     "ta",
  "cultural_meta": {
    "composer":    "AR Rahman",
    "film_name":   "Sillunu Oru Kaadhal",
    "tamil_genre": "melody",
    "lyricist":    "Yugabharathi",

    // Film metadata from TMDB (NEW)
    "film_meta": {
      "director": "Vikraman",
      "cast":     ["Suriya", "Jyothika", "Bhoomika", "Sathyaraj"],
      "imdb_id":  "tt0443574",
      "imdb_url": "https://www.imdb.com/title/tt0443574/"
    }
  },

  // Semantic content
  "description": "AR Rahman composition — gentle melody...",
  "lyrics":      "first 300 chars of lyrics..."
}
```

### Dual Vector Strategy

```
Text RAG Collection  (384-dim · all-MiniLM-L6-v2)
  embeds: title + artist + composer + genre + tempo_label
          + mood_label + description + lyrics
  strength: cultural context, lyrics meaning, composer knowledge

CLAP Audio Collection  (512-dim · DCLAP distilled)
  embeds: raw audio waveform (30 seconds)
  strength: works with zero tags, pure sonic similarity,
            unknown language fallback

Merge: final_score = 0.6 × text_score + 0.4 × clap_score
       Tamil:   0.7 / 0.3  (tags reliable)
       Unknown: 0.3 / 0.7  (CLAP dominant)
```

---

## 05 — Navidrome Integration

### Subsonic ID Matching

Navidrome stores files with distributor prefixes (e.g., `01-03 - Mutham Mutham (StarMusiQ.Com).mp3`). The indexer normalises both sides before matching:

```python
_SITE_NOISE_RE = re.compile(r'[\(\[][\w\s\.]+[\)\]]|\d+[-\s]+\d*[-\s]*', re.I)

def _norm(s: str) -> str:
    s = _SITE_NOISE_RE.sub("", s)
    return s.strip().lower()
```

Match priority: normalised stem → normalised title.

---

## 06 — Infrastructure (docker-compose)

| Service | Image | Port | Notes |
|---|---|---|---|
| `navidrome` | `deluan/navidrome:latest` | 4533 | `./music:/music:ro` · Subsonic API |
| `qdrant` | `qdrant/qdrant:latest` | 6333 | `qdrant_data:/qdrant/storage` · dual collections |
| `ollama` | `ollama/ollama:latest` | 11434 | GPU passthrough · healthcheck |
| `ollama-init` | `ollama/ollama:latest` | — | Auto-pulls `${OLLAMA_MODEL:-gemma2:9b}` on startup |
| `indexer` | `./indexer` | — | `CUDA_VISIBLE_DEVICES=""` (CPU mode for torch) |
| `api` | `./api` | 8000 | JWT auth · depends: qdrant, navidrome, ollama |
| `redis` | `redis:alpine` | 6379 | RQ job queue for indexer workers |
| `postgres` | `postgres:15-alpine` | 5432 | Index metadata · job history |
| `frontend` | `./frontend` | 3000 | React + Vite · depends: api |
| `flutter` | local build | — | Connects to api:8000 + navidrome:4533 |

### VRAM Budget (4060 Ti · 16 GB)

| Process | VRAM |
|---|---|
| Gemma2:9b (Ollama) | ~9 GB |
| CLAP + sentence-transformers | ~2 GB |
| Qdrant HNSW index | ~1 GB |
| Headroom | ~4 GB ✓ |

### Key Docker Notes

- `CUDA_VISIBLE_DEVICES: ""` set for indexer — forces CPU mode to avoid "no kernel image" errors when the torch CPU wheel is used.
- `ollama-init` uses `depends_on: ollama: condition: service_healthy` to wait for Ollama before pulling the model.
- Stale BuildKit cache on WSL2 + Docker Desktop: run `docker builder prune -f && docker compose build --no-cache <service>` or set `DOCKER_BUILDKIT=0`.

---

## 07 — Web Frontend (React + Vite)

### Discover Page — Search UX

```
┌─────────────────────────────────────────────────────────┐
│  Prompt bar                                              │
│  "songs from Maari" · "90s kuthu" · "Kajal Aggarwal"   │
│                                              [Search]    │
├─────────────────────────────────────────────────────────┤
│  ▶ Filters  [2 on]                                       │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Energy  [●──────]  Tempo  [●──────]              │   │
│  │  Valence [●──────]                                │   │
│  │                                                   │   │
│  │  Limit: count slider  OR  Duration (mins)         │   │
│  │  (mutually exclusive — duration disables count)   │   │
│  └──────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│  Results                                                 │
│  ┌─────────────────────────────────────────────────┐    │
│  │ Track card                                       │    │
│  │   Title · Artist · Duration                      │    │
│  │   ┌──────────────────────────────┐               │    │
│  │   │ Film: Maari (2015)           │  ← if film    │    │
│  │   │ Director: Balaji Mohan       │     song      │    │
│  │   │ Cast: Dhanush, Kajal …       │               │    │
│  │   │ IMDb ↗                       │               │    │
│  │   └──────────────────────────────┘               │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### Themes

Six themes ship for web and mobile: `ocean` · `aurora` · `sunset` · `midnight` · `sakura` · `paper`

---

## 08 — Python Constraints

| Package | Constraint | Reason |
|---|---|---|
| `torch` | `>=2.5.0` | Minimum available on PyPI for Python 3.11 on this platform |
| `fasttext-wheel` | requires Python `<3.13` | Do not upgrade base image past 3.11 without verifying |
| `transformers` | `==4.44.0` | Matches torch 2.5.x |
| `click` | `==8.1.8` | Typer 0.12.3 incompatible with Click 8.2.0+ |
| `pyacoustid` | — | Correct PyPI name (not `acoustid`) |

---

## 09 — Extending Driftwave

### Add a Language Adapter

1. Create `indexer/adapters/your_lang.py`
2. Implement `BaseAdapter` (methods: `detect`, `enrich`, `build_description`)
3. Register: `AdapterRegistry.register("lang_code", YourAdapter)`

### Add a Lyrics Source

1. Create a fetcher in `indexer/lyrics/`
2. Add to the waterfall priority list in `indexer/lyrics/fetcher.py`

### Add a Search Hint Type

1. Add field to `TAG_EXTRACTION_PROMPT` in `api/core/retriever.py`
2. Add handler in `build_filters()` (MatchText / MatchAny / Range as appropriate)
3. Add Qdrant payload index in `_ensure_indexes()` in `indexer/embedder.py`

---

## 10 — Next Steps

### Bugs / Correctness

| Issue | Impact | Status | Notes |
|---|---|---|---|
| **Year filter returns 0 results** ("before 2000", "after 2000") | High | Open | `year` stored as string; MatchAny expansion implemented but untested at scale |
| **Tamil tracks in Roman script misdetected as English** | High | Open | Raattinam and similar albums; fasttext lid.176 struggles with romanised Tamil. Add artist-DB or folder-hint pass before fasttext |
| **Audio features unreliable** | Medium | Open | librosa energy=1.0 on ballads, repeated tempo values. Consider replacing with Essentia or Madmom for BPM |
| **Tamil genre always "melody"** | Medium | Open | Downstream of audio features bug; kuthu/gaana not detected without valid energy/tempo |
| **CLAP dual-search not wired** | Medium | Open | `AUDIO_COLLECTION` exists in Qdrant but retriever only queries text collection |
| **AcoustID not wired** | Low | Open | `pyacoustid` in requirements, fingerprinting code present but not invoked in pipeline |
| **"rajini songs" / "maniratnam songs" poor results** | High | Fixed | Added `director_hints` field + Qdrant index; LLM prompt now expands colloquial names (rajini→Rajinikanth, maniratnam→Mani Ratnam, arr→A.R. Rahman, etc.) |

### Features

| Feature | Status | Notes |
|---|---|---|
| **Playlist push to Navidrome** | Open | `/playlist/push` endpoint exists; web UI has no "Save playlist" button yet |
| **Offline mode / PWA** | Partial | Already works offline in Tauri desktop; service worker not added for web |
| **MusicBrainz enrichment** | Open | Wire AcoustID → MusicBrainz lookup for untagged files (MBID, release year, genre) |
| **Malayalam / Japanese adapters** | Partial | Registered but implementation depth varies — verify enrich() coverage |
| **Lyrics sync (LRC timestamps)** | Open | Lyrics fetched and displayed as plain text; karaoke-style scrolling not yet added |
| **Re-index single track** | Open | Watch mode handles new files; no API endpoint to force re-index a specific path |
| **Android / iOS build pipeline** | Open | Flutter code complete; CI pipeline and app signing not set up |
| **Tauri auto-update** | Open | Tauri updater plugin not configured; needed for Windows/macOS distribution |
| **"Save playlist" button (web)** | Open | Discover page has no way to push result playlist to Navidrome from the UI |

### Performance

Current search latency is **3–6 s**, dominated by two sequential Ollama calls (tag extraction + rerank). Planned optimisations in priority order:

| Area | Priority | Approach |
|---|---|---|
| **Skip rerank for filtered queries** | High | When `cast_hints` / `director_hints` / `composer_hints` / `film_hints` filters are present, results are already constrained — skip the second Ollama call entirely. Saves ~2–4 s on name/film searches. |
| **Parallel tag extraction + vector search** | High | Fire broad Qdrant vector search simultaneously with Ollama tag extraction. When tags arrive, filter in-memory. Hides ~1–2 s of LLM latency behind the Qdrant roundtrip. |
| **Prompt-level LRU cache** | Medium | Cache `(normalised_prompt, filters) → (tags, tracks)` with 5-min TTL. Free win for repeat searches and Discover page re-mounts. |
| **Score-boost reranking** | Medium | Replace second Ollama rerank call with rule-based score boosts (+0.2 composer match, +0.15 director/cast, +0.1 film name). Deterministic, eliminates second Ollama call entirely. |
| **Smaller tag extraction model** | Medium | Gemma2:9b is overkill for structured JSON extraction. `gemma2:2b` or `phi3:mini` (3.8B) → ~300–500 ms vs 1–2 s. Keep Gemma2:9b only for rerank. |
| **Streaming results** | Low | Return vector search results immediately; send reranked order as a follow-up. User sees results in ~500 ms, order refines later. Needs frontend streaming support. |
| **CLAP indexing speed** | Low | DCLAP processes ~5 songs/s on 4060 Ti; batch size tuning may help. |
| **Qdrant HNSW ef / m tuning** | Low | Default params; tune for recall vs. latency tradeoff at scale (>50k tracks). |
