"""
Music directory watcher.
Uses watchdog to detect new/modified/deleted files.
Debounces batch drops via Redis queue.
"""
import asyncio
import time
import threading
from pathlib import Path

from watchdog.observers.polling import PollingObserver
from watchdog.events import FileSystemEventHandler
from rich.console import Console

from config import settings, SUPPORTED_EXTENSIONS
from pipeline import IndexPipeline
from embedder import remove_track, is_indexed

console  = Console()
pipeline = IndexPipeline()


def _wait_for_ready(path: str, timeout: int = 30) -> bool:
    """Wait until file size stabilises (copy complete)."""
    prev_size = -1
    for _ in range(timeout):
        try:
            curr_size = Path(path).stat().st_size
            if curr_size == prev_size and curr_size > 0:
                return True
            prev_size = curr_size
        except FileNotFoundError:
            pass
        time.sleep(1)
    return False


class DriftwaveMusicHandler(FileSystemEventHandler):
    def __init__(self):
        self._pending: set[str] = set()
        self._lock    = threading.Lock()
        self._timer   = None

    def on_created(self, event):
        if event.is_directory:
            return
        if Path(event.src_path).suffix.lower() in SUPPORTED_EXTENSIONS:
            self._enqueue(event.src_path)

    def on_modified(self, event):
        if event.is_directory:
            return
        if Path(event.src_path).suffix.lower() in SUPPORTED_EXTENSIONS:
            self._enqueue(event.src_path)

    def on_deleted(self, event):
        if event.is_directory:
            return
        if Path(event.src_path).suffix.lower() in SUPPORTED_EXTENSIONS:
            console.print(f"[yellow]🗑  Removed: {Path(event.src_path).name}[/yellow]")
            remove_track(event.src_path)

    def on_moved(self, event):
        if event.is_directory:
            return
        src  = event.src_path
        dest = event.dest_path
        if Path(dest).suffix.lower() in SUPPORTED_EXTENSIONS:
            console.print(f"[dim]↪  Moved: {Path(src).name} → {Path(dest).name}[/dim]")
            remove_track(src)
            self._enqueue(dest)

    def _enqueue(self, path: str):
        with self._lock:
            self._pending.add(path)
            if self._timer:
                self._timer.cancel()
            # Debounce: flush after 5s of no new files
            self._timer = threading.Timer(5.0, self._flush)
            self._timer.start()

    def _flush(self):
        with self._lock:
            batch = list(self._pending)
            self._pending.clear()

        if not batch:
            return

        console.print(f"\n[cyan]📦 New files detected: {len(batch)} tracks[/cyan]")
        asyncio.run(self._process_batch(batch))

    async def _process_batch(self, paths: list[str]):
        for path in paths:
            if not _wait_for_ready(path):
                console.print(f"[yellow]⚠  File not ready: {Path(path).name}[/yellow]")
                continue
            if is_indexed(path):
                console.print(f"[dim]⏭  Already indexed: {Path(path).name}[/dim]")
                continue
            try:
                track = await pipeline.index_file(path)
                console.print(
                    f"[green]✓ {track.adapter_type.upper()}[/green] "
                    f"{track.artist} — {track.title}"
                )
            except Exception as e:
                console.print(f"[red]✗ {Path(path).name}: {e}[/red]")


class MusicWatcher:
    def __init__(self, music_dir: str = settings.MUSIC_DIR):
        self.music_dir = music_dir
        # PollingObserver works on WSL2 /mnt/ drives where inotify is blind.
        # poll_interval=30s — low enough to catch new files quickly, low CPU overhead.
        self.observer  = PollingObserver(timeout=30)
        self.handler   = DriftwaveMusicHandler()

    def start(self):
        self.observer.schedule(self.handler, self.music_dir, recursive=True)
        self.observer.start()
        console.print(f"[cyan]👁  Watching [bold]{self.music_dir}[/bold] for changes...[/cyan]")
        console.print("[dim]Press Ctrl+C to stop[/dim]\n")
        try:
            while self.observer.is_alive():
                self.observer.join(timeout=1)
        except KeyboardInterrupt:
            self.observer.stop()
            console.print("\n[dim]Watcher stopped[/dim]")
        self.observer.join()
