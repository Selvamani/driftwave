"""
Driftwave Indexer
CLI entry point — scan, watch, or reset the music library index.
"""
import asyncio
import logging
import os
import typer

logging.basicConfig(level=logging.WARNING,
                    format="%(levelname)s %(name)s: %(message)s")
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn

from config import settings
from pipeline import IndexPipeline
from watcher import MusicWatcher
from db import init_db

app  = typer.Typer(help="Driftwave music indexer")
con  = Console()

@app.command()
def scan(
    music_dir: str = typer.Option(settings.MUSIC_DIR, help="Music directory to scan"),
    workers:   int = typer.Option(settings.LIBROSA_WORKERS, help="Parallel workers for audio analysis"),
    force:     bool = typer.Option(False, help="Re-index already indexed tracks"),
):
    """Full library scan — index all music files."""
    con.print(f"\n[bold cyan]〜 Driftwave Indexer[/bold cyan]")
    con.print(f"  Music dir : [dim]{music_dir}[/dim]")
    con.print(f"  Workers   : [dim]{workers}[/dim]")
    con.print(f"  Force     : [dim]{force}[/dim]\n")

    asyncio.run(_scan(music_dir, workers, force))

@app.command()
def watch(
    music_dir: str = typer.Option(settings.MUSIC_DIR, help="Music directory to watch"),
):
    """Watch mode — auto-index new/changed files."""
    con.print(f"\n[bold cyan]〜 Driftwave Watcher[/bold cyan]")
    con.print(f"  Watching  : [dim]{music_dir}[/dim]\n")

    watcher = MusicWatcher(music_dir)
    watcher.start()

@app.command()
def reset(
    music_dir: str = typer.Option(settings.MUSIC_DIR, help="Music directory to scan after reset"),
):
    """Reset index — clear Qdrant collections then re-scan."""
    con.print("[yellow]⚠  Resetting index...[/yellow]")
    pipeline = IndexPipeline()
    pipeline.reset_collections()
    con.print("[green]✓ Collections cleared[/green]")

async def _scan(music_dir: str, workers: int, force: bool):
    await init_db()
    pipeline = IndexPipeline(workers=workers)
    await pipeline.scan(music_dir, force=force)

if __name__ == "__main__":
    app()
