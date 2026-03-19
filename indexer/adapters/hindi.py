"""Hindi / Bollywood language adapter."""
from adapters import BaseAdapter
from models import EnrichedTrack

COMPOSER_VIBES = {
    "ar rahman":          "fusion masterpieces blending Indian classical with world music",
    "pritam":             "youthful romantic melodies with memorable hooks",
    "vishal-shekhar":     "peppy urban dance tracks with electric energy",
    "amit trivedi":       "indie theatrical richness with emotional depth",
    "shankar ehsaan loy": "eclectic world-fusion with experimental textures",
    "r.d. burman":        "iconic 70s-80s retro funk and timeless melodies",
    "mithoon":            "deeply emotional ballads with aching longing",
    "a.r. rahman":        "fusion masterpieces blending Indian classical with world music",
}

ERA_VIBES = {
    "195": "golden era Bollywood, rich orchestral arrangements",
    "196": "golden era Bollywood, melodic Shankar Jaikishan style",
    "197": "RD Burman era, funky disco-influenced Bollywood",
    "198": "synth-pop Bollywood, catchy filmi style",
    "199": "romantic era, Kumar Sanu, lush ballads",
    "200": "modern Bollywood fusion, electronic influences",
    "201": "contemporary Bollywood, indie and electronic blend",
    "202": "current era Bollywood, streaming-optimised pop",
}

class HindiAdapter(BaseAdapter):
    name = "hindi"

    def detect(self, tags, file_path) -> bool:
        return False

    async def enrich(self, tags, features, lyrics, file_path) -> EnrichedTrack:
        composer = tags.get("composer", tags.get("albumartist", ""))
        year = str(tags.get("year", ""))
        era_desc = ""
        for prefix, desc in ERA_VIBES.items():
            if year.startswith(prefix):
                era_desc = desc
                break

        cultural_meta = {
            "composer":     composer,
            "film_name":    tags.get("album", ""),
            "era":          year[:4] if year else "",
            "era_desc":     era_desc,
            "lyricist":     tags.get("lyricist", ""),
            "is_film_song": True,
        }

        track = EnrichedTrack(
            **self._base_fields(tags, features, lyrics),
            adapter_type="hindi",
            language="hi",
            cultural_meta=cultural_meta,
        )
        track.description = self.build_description(track)
        return track

    def build_description(self, track: EnrichedTrack) -> str:
        cm = track.cultural_meta
        parts = []
        composer_lower = cm.get("composer", "").lower()
        for name, vibe in COMPOSER_VIBES.items():
            if name in composer_lower:
                parts.append(f"Composed by {cm['composer']} — {vibe}.")
                break
        if cm.get("era_desc"):
            parts.append(cm["era_desc"] + ".")
        if cm.get("film_name"):
            parts.append(f"From '{cm['film_name']}'.")
        parts.append(self._tempo_mood_desc(track))
        return " ".join(parts)
