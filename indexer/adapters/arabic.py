"""Arabic music adapter."""
from adapters import BaseAdapter
from models import EnrichedTrack

class ArabicAdapter(BaseAdapter):
    name = "arabic"

    def detect(self, tags, file_path) -> bool:
        return False

    async def enrich(self, tags, features, lyrics, file_path) -> EnrichedTrack:
        cultural_meta = {
            "region": self._detect_region(tags),
        }
        track = EnrichedTrack(
            **self._base_fields(tags, features, lyrics),
            adapter_type="arabic",
            language="ar",
            cultural_meta=cultural_meta,
        )
        track.description = f"Arabic music from {cultural_meta['region']} tradition. {self._tempo_mood_desc(track)}"
        return track

    def _detect_region(self, tags) -> str:
        text = f"{tags.get('artist','')} {tags.get('album','')}".lower()
        if any(w in text for w in ["khaleeji", "gulf", "emirati", "saudi"]):
            return "Gulf/Khaleeji"
        if any(w in text for w in ["egyptian", "cairo", "masri"]):
            return "Egyptian"
        if any(w in text for w in ["levant", "syrian", "lebanese"]):
            return "Levantine"
        return "Arabic"
