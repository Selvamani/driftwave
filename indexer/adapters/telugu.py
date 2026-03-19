"""Telugu / Tollywood adapter."""
from adapters import BaseAdapter
from models import EnrichedTrack

COMPOSER_VIBES = {
    "s.s. thaman":     "energetic mass entertainers, powerful beats, high-octane",
    "thaman":          "energetic mass entertainers, powerful beats",
    "devi sri prasad": "DSP — catchy mass commercial with electronic energy",
    "m.m. keeravani":  "classical meets modern, dramatic orchestration",
    "anirudh":         "youthful, modern, electronic hooks",
    "mickey j meyer":  "feel-good melodic, romantic and soft",
}

class TeluguAdapter(BaseAdapter):
    name = "telugu"

    def detect(self, tags, file_path) -> bool:
        return False

    async def enrich(self, tags, features, lyrics, file_path) -> EnrichedTrack:
        composer = tags.get("composer", tags.get("albumartist", ""))
        cultural_meta = {
            "composer":  composer,
            "film_name": tags.get("album", ""),
        }
        track = EnrichedTrack(
            **self._base_fields(tags, features, lyrics),
            adapter_type="telugu",
            language="te",
            cultural_meta=cultural_meta,
        )
        track.description = self.build_description(track)
        return track

    def build_description(self, track: EnrichedTrack) -> str:
        cm = track.cultural_meta
        composer_lower = cm.get("composer", "").lower()
        for name, vibe in COMPOSER_VIBES.items():
            if name in composer_lower:
                return f"Telugu film music by {cm['composer']} — {vibe}. {self._tempo_mood_desc(track)}"
        return f"Telugu film song from '{cm.get('film_name', 'Unknown')}'. {self._tempo_mood_desc(track)}"
