"""
Base adapter interface and registry.
All language adapters inherit from BaseAdapter.
"""
from abc import ABC, abstractmethod
from models import EnrichedTrack

class BaseAdapter(ABC):
    name: str = "base"

    @abstractmethod
    def detect(self, tags: dict, file_path: str) -> bool:
        """Return True if this adapter should handle the track."""
        pass

    @abstractmethod
    async def enrich(
        self,
        tags:      dict,
        features:  dict,
        lyrics:    str,
        file_path: str,
    ) -> EnrichedTrack:
        """Extract culture-specific metadata and build description."""
        pass

    def _base_fields(self, tags: dict, features: dict, lyrics: str) -> dict:
        return {
            "title":    tags.get("title",  "Unknown"),
            "artist":   tags.get("artist", "Unknown"),
            "album":    tags.get("album",  "Unknown"),
            "year":     str(tags.get("year", "")),
            "genre":    tags.get("genre",  ""),
            "duration": tags.get("duration", 0),
            "tempo":    features.get("tempo",   0.0),
            "energy":   features.get("energy",  0.0),
            "valence":  features.get("valence", 0.0),
            "key":      features.get("key", ""),
            "lyrics":   lyrics,
        }

    def _tempo_mood_desc(self, track: EnrichedTrack) -> str:
        tempo_desc = (
            "slow and languid"   if track.tempo < 70 else
            "gentle mid-tempo"   if track.tempo < 95 else
            "moderate"           if track.tempo < 115 else
            "upbeat"             if track.tempo < 135 else
            "fast and driving"
        )
        mood_desc = (
            "deeply melancholic"  if track.valence < 0.25 else
            "wistful and longing" if track.valence < 0.4  else
            "emotionally balanced"if track.valence < 0.55 else
            "warm and uplifting"  if track.valence < 0.75 else
            "bright and joyful"
        )
        return f"A {tempo_desc} track with a {mood_desc} feel."


class AdapterRegistry:
    def __init__(self):
        self._adapters: list[BaseAdapter] = []

    def register(self, adapter: BaseAdapter) -> "AdapterRegistry":
        """Insert before the default adapter (always last)."""
        self._adapters.insert(max(0, len(self._adapters) - 1), adapter)
        return self

    def _setup_defaults(self):
        from adapters.tamil   import TamilAdapter
        from adapters.hindi   import HindiAdapter
        from adapters.korean  import KoreanAdapter
        from adapters.arabic  import ArabicAdapter
        from adapters.telugu  import TeluguAdapter
        from adapters.default import DefaultAdapter

        self._adapters = [
            TamilAdapter(),
            HindiAdapter(),
            KoreanAdapter(),
            ArabicAdapter(),
            TeluguAdapter(),
            DefaultAdapter(),   # always last
        ]

    def get(self, language: str, confidence: float) -> BaseAdapter:
        """Get the best adapter for this language."""
        if confidence < 0.4:
            # Low confidence → default adapter, let CLAP carry the weight
            return self._adapters[-1]

        for adapter in self._adapters:
            if adapter.name == language:
                return adapter

        return self._adapters[-1]  # DefaultAdapter

# Singleton
_registry = AdapterRegistry()

def get_registry() -> AdapterRegistry:
    if not _registry._adapters:
        _registry._setup_defaults()
    return _registry
