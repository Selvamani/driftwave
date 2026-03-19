"""
IndexPipeline — orchestrates the full indexing flow.
Handles scan, batch processing, and per-file indexing.
"""
import asyncio
import os
from pathlib import Path
from typing import Optional

from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn, TimeElapsedColumn

from config import settings, SUPPORTED_EXTENSIONS
from tag_extractor import extract_tags
from audio_analyzer import analyze_audio, analyze_batch
from lyrics.fetcher import get_lyrics
from language_detector import LanguageDetector, detect_from_script, detect_from_artist_db, detect_from_path
from adapters import get_registry
from describer import get_description
from embedder import (
    init_collections, reset_collections,
    store_track, is_indexed,
)
from navidrome import find_song_id

console  = Console()
detector = LanguageDetector()


class IndexPipeline:
    def __init__(self, workers: int = 4):
        self.workers = workers
        init_collections()

    def reset_collections(self):
        reset_collections()

    async def scan(self, music_dir: str, force: bool = False):
        """Full library scan."""
        files = self._find_music_files(music_dir)
        if not files:
            console.print(f"[yellow]No music files found in {music_dir}[/yellow]")
            return

        console.print(f"[cyan]Found {len(files)} music files[/cyan]")

        # Filter already-indexed unless force
        if not force:
            to_index = [f for f in files if not is_indexed(f)]
            skipped  = len(files) - len(to_index)
            if skipped:
                console.print(f"[dim]Skipping {skipped} already-indexed tracks[/dim]")
        else:
            to_index = files

        if not to_index:
            console.print("[green]✓ Library is up to date[/green]")
            return

        console.print(f"[cyan]Indexing {len(to_index)} tracks...[/cyan]\n")

        # Batch audio analysis (parallel, CPU-bound)
        console.print("[dim]Analyzing audio features (parallel)...[/dim]")
        features_list = await analyze_batch(to_index, workers=self.workers)

        # Sequential enrichment (Ollama calls, lyrics, embedding)
        success = 0
        errors  = 0

        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            TaskProgressColumn(),
            TimeElapsedColumn(),
            console=console,
        ) as progress:
            task = progress.add_task("Indexing...", total=len(to_index))

            for file_path, features in zip(to_index, features_list):
                try:
                    await self.index_file(file_path, features)
                    success += 1
                except Exception as e:
                    errors += 1
                    console.print(f"[red]✗ {Path(file_path).name}: {e}[/red]")
                finally:
                    progress.advance(task)

        console.print(f"\n[green]✓ Indexed {success} tracks[/green]", end="")
        if errors:
            console.print(f" [red]({errors} errors)[/red]")
        else:
            console.print()

    async def index_file(
        self,
        file_path: str,
        features:  Optional[dict] = None,
    ):
        """Index a single file — extract, enrich, embed, store."""
        if features is None:
            loop = asyncio.get_event_loop()
            features = await loop.run_in_executor(None, analyze_audio, file_path)

        # 1. Extract tags
        tags = extract_tags(file_path)

        # 2a. Preliminary language hint from tags + path (no lyrics yet)
        #     Used to activate language-specific lyrics scrapers.
        _prelim_lang = (
            detect_from_script(tags)
            or detect_from_artist_db(tags)
            or detect_from_path(file_path)
            or ""
        )

        # 2b. Fetch lyrics (Tamil scraper triggered when hint is 'tamil')
        lyrics, lyrics_source = await get_lyrics(
            file_path=file_path,
            title=tags.get("title", ""),
            artist=tags.get("artist", ""),
            duration=tags.get("duration", 0),
            lang_hint=_prelim_lang,
        )

        # 3. Detect language (full detection now has lyrics too)
        lang, confidence = detector.detect(tags, file_path, lyrics)

        # 4. Get adapter + enrich
        registry = get_registry()
        adapter  = registry.get(lang, confidence)
        track    = await adapter.enrich(tags, features, lyrics, file_path)

        track.lang_confidence = confidence
        track.lyrics_source   = lyrics_source
        track.file_path       = file_path

        # 5. Generate AI description (Ollama → template fallback)
        if not track.description:
            track.description = await get_description(track)

        # 6. Resolve Navidrome song ID (best-effort)
        if not track.subsonic_id:
            track.subsonic_id = await find_song_id(track.title, file_path)

        # 7. Embed + store in Qdrant
        store_track(track)

        return track

    def _find_music_files(self, music_dir: str) -> list[str]:
        files = []
        for path in Path(music_dir).rglob("*"):
            if path.suffix.lower() in SUPPORTED_EXTENSIONS:
                files.append(str(path))
        return sorted(files)
