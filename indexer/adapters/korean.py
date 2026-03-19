"""Korean / K-pop adapter."""
from adapters import BaseAdapter
from models import EnrichedTrack

KPOP_CONCEPTS = {
    "girl group":  "bright synchronized choreography-driven idol pop",
    "boy group":   "intense synchronized performance-driven group dynamics",
    "ballad":      "emotional piano-driven heartbreak themes",
    "trot":        "traditional Korean pop with older audience appeal",
    "indie":       "lo-fi authentic non-mainstream Korean indie",
    "hip hop":     "Korean hip-hop with street culture and wordplay",
    "r&b":         "smooth Korean R&B with soulful vocals",
}

class KoreanAdapter(BaseAdapter):
    name = "korean"

    def detect(self, tags, file_path) -> bool:
        return False

    async def enrich(self, tags, features, lyrics, file_path) -> EnrichedTrack:
        artist = tags.get("artist", "").lower()
        concept = self._detect_concept(tags, features)
        cultural_meta = {
            "concept":      concept,
            "group_type":   "group" if any(
                                g in artist for g in ["bts", "blackpink", "exo", "aespa", "nct", "twice", "seventeen"]
                            ) else "solo",
        }
        track = EnrichedTrack(
            **self._base_fields(tags, features, lyrics),
            adapter_type="korean",
            language="ko",
            cultural_meta=cultural_meta,
        )
        track.description = self.build_description(track)
        return track

    def build_description(self, track: EnrichedTrack) -> str:
        cm = track.cultural_meta
        concept = cm.get("concept", "")
        desc = KPOP_CONCEPTS.get(concept, "Korean pop track")
        return f"K-pop — {desc}. {self._tempo_mood_desc(track)}"

    def _detect_concept(self, tags, features) -> str:
        genre = tags.get("genre", "").lower()
        if "ballad" in genre:  return "ballad"
        if "trot"   in genre:  return "trot"
        if "hip"    in genre:  return "hip hop"
        if "r&b"    in genre:  return "r&b"
        if "indie"  in genre:  return "indie"
        if features.get("energy", 0) > 0.6 and features.get("tempo", 0) > 120:
            return "boy group"
        return "girl group"
