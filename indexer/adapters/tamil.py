"""Tamil language adapter — film songs, composers, cultural context."""
from adapters import BaseAdapter
from film_meta import fetch_film_meta
from models import EnrichedTrack

COMPOSER_VIBES = {
    "ar rahman":             "spiritually rich, layered orchestration, genre-blending, often euphoric or deeply emotional",
    "a.r. rahman":           "spiritually rich, layered orchestration, genre-blending, often euphoric or deeply emotional",
    "yuvan shankar raja":    "youthful, urban, hip-hop influenced, melancholic melodies, strong bass lines",
    "yuvan":                 "youthful urban melancholy with hip-hop undertones",
    "anirudh ravichander":   "modern, peppy, youth-oriented, electronic beats, catchy hooks",
    "anirudh":               "modern peppy electronic with catchy hooks",
    "harris jayaraj":        "lush strings, romantic melodies, smooth western-classical fusion",
    "d. imman":              "folk-influenced, devotional undertones, strong melody-first approach",
    "ilaiyaraaja":           "carnatic roots, intricate arrangements, timeless folk-classical fusion",
    "ilayaraja":             "carnatic roots, intricate arrangements, timeless folk-classical fusion",
    "santhosh narayanan":    "experimental, raw folk energy, social themes, earthy textures",
    "gv prakash kumar":      "peppy, commercial, dance-friendly, youthful",
    "gv prakash":            "peppy commercial dance-friendly",
    "sid sriram":            "soulful vocals, R&B influenced, deeply emotional",
    "vijay antony":          "folk-fusion, raw street energy, political undertones",
    "james vasanthan":       "classical carnatic with modern production",
    "sean roldan":           "indie, experimental, cinematic",
}

GENRE_MAP = {
    "kuthu":      "high-energy dance track with driving rhythm, festival or celebration vibes",
    "melody":     "soft melodic song, emotionally driven, suitable for reflective or romantic moods",
    "gaana":      "raw Chennai street-folk style, urban gritty energy",
    "folk":       "rural Tamil folk, earthy instruments like nadaswaram or thavil",
    "bgm":        "background score, instrumental, cinematic mood-setter",
    "sad":        "emotionally heavy, longing or grief themes",
    "duet":       "romantic male-female vocal interplay",
    "devotional": "spiritual themes, temple or festival context",
    "dance":      "club or stage performance energy, fast tempo",
    "classical":  "carnatic classical tradition, deep melodic structure",
}

class TamilAdapter(BaseAdapter):
    name = "tamil"

    def detect(self, tags: dict, file_path: str) -> bool:
        # Script detection happens in LanguageDetector
        # This is used when registry.get("tamil", ...) is called
        return False  # detection is handled by LanguageDetector

    async def enrich(self, tags, features, lyrics, file_path) -> EnrichedTrack:
        composer  = self._extract_composer(tags)
        film_name = self._extract_film(tags)
        genre     = self._detect_genre(tags, features)

        film_meta = await fetch_film_meta(film_name, language="ta", year=str(tags.get("year", ""))) if film_name else {}

        cultural_meta = {
            "composer":     composer,
            "film_name":    film_name,
            "tamil_genre":  genre,
            "is_film_song": bool(film_name),
            "lyricist":     tags.get("lyricist", ""),
            "film_meta":    film_meta,   # {director, cast, imdb_id, imdb_url} or {}
        }

        track = EnrichedTrack(
            **self._base_fields(tags, features, lyrics),
            adapter_type="tamil",
            language="ta",
            cultural_meta=cultural_meta,
        )
        # Replace raw ID3 genre tag (e.g. "Tamil - StarMusiQ.Com") with
        # the clean detected genre (e.g. "melody", "kuthu", "folk")
        track.genre = genre.capitalize()
        track.description = self.build_description(track)
        return track

    def build_description(self, track: EnrichedTrack) -> str:
        cm = track.cultural_meta
        parts = []

        composer_lower = cm.get("composer", "").lower()
        for name, vibe in COMPOSER_VIBES.items():
            if name in composer_lower:
                parts.append(f"Composed by {cm['composer']}, known for {vibe}.")
                break

        if cm.get("film_name"):
            fm = cm.get("film_meta", {})
            film_str = f"From the film '{cm['film_name']}'"
            if fm.get("director"):
                film_str += f", directed by {fm['director']}"
            if fm.get("cast"):
                film_str += f", starring {', '.join(fm['cast'][:3])}"
            parts.append(film_str + ".")

        genre = cm.get("tamil_genre", "").lower()
        for g, desc in GENRE_MAP.items():
            if g in genre:
                parts.append(desc.capitalize() + ".")
                break

        lyricist = cm.get("lyricist", "").strip()
        if lyricist:
            parts.append(f"Lyrics by {lyricist}.")

        parts.append(self._tempo_mood_desc(track))
        return " ".join(parts) if parts else self._tempo_mood_desc(track)

    def _extract_composer(self, tags: dict) -> str:
        # Check multiple tag fields where composer might live
        for field in ("composer", "albumartist", "conductor"):
            val = tags.get(field, "")
            if val and val.lower() not in ("unknown", "various artists", ""):
                return val
        return ""

    def _extract_film(self, tags: dict) -> str:
        album = tags.get("album", "")
        # Many Tamil MP3s use album field for film name
        # Exclude obvious non-film patterns
        non_film = ["greatest hits", "best of", "collection", "unknown", "compilation"]
        if album and not any(n in album.lower() for n in non_film):
            return album
        return ""

    # Sites that tag-spam their name into the genre field
    _GENRE_NOISE = ("starmusiQ", "masstamilan", "isaimini", "kuttyweb",
                    "starmusiq", "tamilwire", "tamiltunes", "123musiq")

    def _detect_genre(self, tags: dict, features: dict) -> str:
        raw = tags.get("genre", "")
        # Strip download-site noise from genre tag
        if any(n.lower() in raw.lower() for n in self._GENRE_NOISE):
            raw = ""
        genre = raw.lower()
        for g in GENRE_MAP:
            if g in genre:
                return g
        # Infer from audio features
        if features.get("tempo", 0) > 130 and features.get("energy", 0) > 0.6:
            return "kuthu"
        if features.get("tempo", 0) < 80 and features.get("energy", 0) < 0.4:
            return "melody"
        return "melody"
