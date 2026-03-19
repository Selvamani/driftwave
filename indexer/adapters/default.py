"""Default adapter — Western music and unknown languages."""
import re
from adapters import BaseAdapter
from models import EnrichedTrack

# Site names that spam the genre field
_GENRE_NOISE_RE = re.compile(
    r'\b(starmusiQ|masstamilan|isaimini|kuttyweb|starmusiq|tamilwire|tamiltunes|123musiq)\b',
    re.IGNORECASE,
)

DECADE_VIBES = {
    "196": "classic 60s sound",
    "197": "70s funk and rock",
    "198": "80s synth and new wave",
    "199": "90s alternative and pop",
    "200": "2000s mainstream pop and rock",
    "201": "2010s streaming era",
    "202": "contemporary",
}

class DefaultAdapter(BaseAdapter):
    name = "default"

    def detect(self, tags, file_path) -> bool:
        return True  # always matches — last in registry

    async def enrich(self, tags, features, lyrics, file_path) -> EnrichedTrack:
        year = str(tags.get("year", ""))
        decade_desc = ""
        for prefix, desc in DECADE_VIBES.items():
            if year.startswith(prefix):
                decade_desc = desc
                break

        cultural_meta = {
            "decade_desc": decade_desc,
        }

        track = EnrichedTrack(
            **self._base_fields(tags, features, lyrics),
            adapter_type="default",
            language="en",
            cultural_meta=cultural_meta,
        )
        # Strip site-noise from genre tag
        if _GENRE_NOISE_RE.search(track.genre or ""):
            track.genre = ""
        track.description = self.build_description(track)
        return track

    def build_description(self, track: EnrichedTrack) -> str:
        cm = track.cultural_meta
        parts = []
        if cm.get("decade_desc"):
            parts.append(f"{cm['decade_desc'].capitalize()}.")
        if track.genre:
            parts.append(f"{track.genre} track.")
        parts.append(self._tempo_mood_desc(track))
        return " ".join(parts)
