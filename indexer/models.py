from dataclasses import dataclass, field
from typing import Optional

@dataclass
class AudioFeatures:
    tempo:   float = 0.0
    energy:  float = 0.0
    valence: float = 0.0
    key:     str   = "Unknown"

@dataclass
class EnrichedTrack:
    # ── File ──────────────────────────
    file_path:    str = ""
    subsonic_id:  str = ""
    mbid:         str = ""

    # ── Universal tags ────────────────
    title:        str = "Unknown"
    artist:       str = "Unknown"
    album:        str = "Unknown"
    year:         str = ""
    genre:        str = ""
    duration:     int = 0

    # ── Audio features ────────────────
    tempo:        float = 0.0
    energy:       float = 0.0
    valence:      float = 0.0
    key:          str   = ""

    # ── Language / adapter ────────────
    adapter_type: str   = "default"
    language:     str   = "en"
    lang_confidence: float = 0.0

    # ── Semantic content ──────────────
    lyrics:       str = ""
    lyrics_source: str = "none"
    description:  str = ""

    # ── Culture-specific metadata ─────
    cultural_meta: dict = field(default_factory=dict)

    def to_qdrant_payload(self) -> dict:
        return {
            "file_path":    self.file_path,
            "subsonic_id":  self.subsonic_id,
            "mbid":         self.mbid,
            "title":        self.title,
            "artist":       self.artist,
            "album":        self.album,
            "year":         self.year,
            "genre":        self.genre,
            "duration":     self.duration,
            "tempo":        self.tempo,
            "energy":       self.energy,
            "valence":      self.valence,
            "key":          self.key,
            "adapter_type": self.adapter_type,
            "language":     self.language,
            "lyrics":        self.lyrics[:1500] if self.lyrics else "",
            "lyrics_source": self.lyrics_source,
            "description":   self.description,
            "cultural_meta": self.cultural_meta,
        }

    def to_embed_document(self) -> str:
        """Build rich text document for embedding."""
        tempo_label = (
            "very slow" if self.tempo < 60 else
            "slow"      if self.tempo < 80 else
            "moderate"  if self.tempo < 110 else
            "fast"      if self.tempo < 140 else
            "very fast"
        )
        energy_label = (
            "very quiet and soft"   if self.energy < 0.2 else
            "calm and gentle"       if self.energy < 0.4 else
            "moderate energy"       if self.energy < 0.6 else
            "energetic"             if self.energy < 0.8 else
            "very loud and intense"
        )
        mood_label = (
            "dark and melancholic"  if self.valence < 0.25 else
            "wistful and longing"   if self.valence < 0.4  else
            "balanced"              if self.valence < 0.55 else
            "warm and uplifting"    if self.valence < 0.75 else
            "bright and euphoric"
        )

        cm = self.cultural_meta
        cultural_parts = []
        if cm.get("composer"):
            cultural_parts.append(f"Composer: {cm['composer']}")
        if cm.get("film_name"):
            cultural_parts.append(f"Film: {cm['film_name']}")
        if cm.get("tamil_genre"):
            cultural_parts.append(f"Style: {cm['tamil_genre']}")
        if cm.get("era"):
            cultural_parts.append(f"Era: {cm['era']}")

        return f"""Title: {self.title}
Artist: {self.artist}
Album: {self.album}
Year: {self.year}
Genre: {self.genre}
Language: {self.language}
Tempo: {tempo_label} ({self.tempo:.1f} BPM)
Energy: {energy_label}
Mood: {mood_label}
Key: {self.key}
{chr(10).join(cultural_parts)}
Description: {self.description}
Lyrics: {self.lyrics[:300]}""".strip()
