"""Extract ID3 / metadata tags from audio files."""
import os
from pathlib import Path

from mutagen import File
from mutagen.easyid3 import EasyID3
from mutagen.id3 import ID3
from mutagen.mp3 import MP3
from mutagen.flac import FLAC
from mutagen.mp4 import MP4
from mutagen.oggvorbis import OggVorbis


def extract_tags(file_path: str) -> dict:
    """
    Extract metadata tags from any supported audio file.
    Returns a normalised dict with consistent field names.
    """
    ext  = Path(file_path).suffix.lower()
    tags = {}

    try:
        if ext == ".mp3":
            tags = _extract_mp3(file_path)
        elif ext == ".flac":
            tags = _extract_flac(file_path)
        elif ext in (".m4a", ".aac", ".mp4"):
            tags = _extract_mp4(file_path)
        elif ext in (".ogg", ".opus"):
            tags = _extract_ogg(file_path)
        else:
            tags = _extract_generic(file_path)
    except Exception as e:
        tags = {"error": str(e)}

    # Ensure all expected fields exist
    defaults = {
        "title":    Path(file_path).stem,
        "artist":   "Unknown",
        "album":    "Unknown",
        "year":     "",
        "genre":    "",
        "composer": "",
        "lyricist": "",
        "duration": 0,
        "track":    "",
    }
    return {**defaults, **{k: v for k, v in tags.items() if v}}


def _extract_mp3(file_path: str) -> dict:
    audio = MP3(file_path)
    duration = int(audio.info.length)
    try:
        easy = EasyID3(file_path)
        raw  = ID3(file_path)
    except Exception:
        return {"duration": duration}

    tags = {
        "title":    _first(easy.get("title")),
        "artist":   _first(easy.get("artist")),
        "album":    _first(easy.get("album")),
        "year":     _first(easy.get("date", easy.get("year")))[:4] if easy.get("date") or easy.get("year") else "",
        "genre":    _first(easy.get("genre")),
        "duration": duration,
    }

    # Composer — stored in TCOM frame
    tcom = raw.get("TCOM")
    if tcom:
        tags["composer"] = str(tcom)

    # Lyricist — TEXT frame
    text = raw.get("TEXT")
    if text:
        tags["lyricist"] = str(text)

    # Album artist for composer fallback
    tpe2 = raw.get("TPE2")
    if tpe2 and not tags.get("composer"):
        tags["albumartist"] = str(tpe2)

    return tags


def _extract_flac(file_path: str) -> dict:
    audio = FLAC(file_path)
    return {
        "title":    _first(audio.get("title")),
        "artist":   _first(audio.get("artist")),
        "album":    _first(audio.get("album")),
        "year":     (_first(audio.get("date")) or "")[:4],
        "genre":    _first(audio.get("genre")),
        "composer": _first(audio.get("composer")),
        "lyricist": _first(audio.get("lyricist")),
        "duration": int(audio.info.length),
    }


def _extract_mp4(file_path: str) -> dict:
    audio = MP4(file_path)
    t = audio.tags or {}
    return {
        "title":    _first(t.get("\xa9nam")),
        "artist":   _first(t.get("\xa9ART")),
        "album":    _first(t.get("\xa9alb")),
        "year":     str(_first(t.get("\xa9day")) or "")[:4],
        "genre":    _first(t.get("\xa9gen")),
        "composer": _first(t.get("\xa9wrt")),
        "duration": int(audio.info.length),
    }


def _extract_ogg(file_path: str) -> dict:
    audio = OggVorbis(file_path)
    return {
        "title":    _first(audio.get("title")),
        "artist":   _first(audio.get("artist")),
        "album":    _first(audio.get("album")),
        "year":     (_first(audio.get("date")) or "")[:4],
        "genre":    _first(audio.get("genre")),
        "composer": _first(audio.get("composer")),
        "duration": int(audio.info.length),
    }


def _extract_generic(file_path: str) -> dict:
    audio = File(file_path)
    if audio is None:
        return {}
    return {"duration": int(getattr(audio.info, "length", 0))}


def _first(val) -> str:
    if val is None:
        return ""
    if isinstance(val, (list, tuple)):
        return str(val[0]) if val else ""
    return str(val)
