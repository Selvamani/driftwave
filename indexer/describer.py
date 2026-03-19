"""
AI description generator using Ollama local LLM.
Falls back to template-based description if Ollama unavailable.
"""
import httpx
from models import EnrichedTrack
from config import settings


PROMPT_TEMPLATE = """\
You are a music expert. Write a 2-sentence description of this song for a music recommendation system.
Focus on mood, atmosphere, use-case (e.g. 'perfect for late-night drives'), and sonic character.
Be specific and evocative. Output ONLY the description, no preamble.

Track info:
- Title: {title} by {artist}
- Album/Film: {album} ({year})
- Genre: {genre}
- Tempo: {tempo} BPM
- Energy: {energy}/1.0
- Valence (brightness): {valence}/1.0
- Key: {key}
- Language: {language}
{cultural_context}
- Lyrics snippet: "{lyrics}"
"""


async def generate_description_ollama(track: EnrichedTrack) -> str:
    """Generate description via local Ollama LLM."""
    cm = track.cultural_meta
    cultural_lines = []
    if cm.get("composer"):
        cultural_lines.append(f"- Composer: {cm['composer']}")
    if cm.get("film_name"):
        cultural_lines.append(f"- Film: {cm['film_name']}")
    if cm.get("tamil_genre"):
        cultural_lines.append(f"- Style: {cm['tamil_genre']}")
    if cm.get("era_desc"):
        cultural_lines.append(f"- Era: {cm['era_desc']}")

    prompt = PROMPT_TEMPLATE.format(
        title=track.title,
        artist=track.artist,
        album=track.album,
        year=track.year,
        genre=track.genre,
        tempo=track.tempo,
        energy=track.energy,
        valence=track.valence,
        key=track.key,
        language=track.language,
        cultural_context="\n".join(cultural_lines),
        lyrics=track.lyrics[:200] if track.lyrics else "",
    )

    try:
        async with httpx.AsyncClient() as client:
            r = await client.post(
                f"{settings.OLLAMA_HOST}/api/generate",
                json={
                    "model":   settings.OLLAMA_MODEL,
                    "prompt":  prompt,
                    "stream":  False,
                    "options": {
                        "temperature": 0.7,
                        "num_predict": 120,
                    },
                },
                timeout=30,
            )
            if r.status_code == 200:
                text = r.json().get("response", "").strip()
                if text:
                    return text
    except Exception:
        pass

    return ""


def generate_description_template(track: EnrichedTrack) -> str:
    """
    Template-based description — zero cost, zero dependencies.
    Used as fallback when Ollama is unavailable.
    """
    cm = track.cultural_meta

    tempo_desc = (
        "a slow, unhurried"   if track.tempo < 65 else
        "a laid-back"         if track.tempo < 85 else
        "a mid-tempo"         if track.tempo < 110 else
        "an upbeat"           if track.tempo < 135 else
        "a fast-paced"
    )
    energy_desc = (
        "delicate and hushed"   if track.energy < 0.2 else
        "soft and gentle"       if track.energy < 0.4 else
        "moderately dynamic"    if track.energy < 0.6 else
        "powerful and driving"  if track.energy < 0.8 else
        "intense and explosive"
    )
    mood_desc = (
        "melancholic and introspective" if track.valence < 0.25 else
        "bittersweet and reflective"    if track.valence < 0.4  else
        "balanced and understated"      if track.valence < 0.55 else
        "warm and optimistic"           if track.valence < 0.75 else
        "bright and euphoric"
    )

    # Key character
    key_feel = (
        "minor tonality gives it a darker, more introspective character"
        if "minor" in track.key.lower()
        else "major key gives it an open, resolved quality"
    )

    # Use-case heuristic
    if track.tempo < 80 and track.valence < 0.4:
        use_case = "late-night listening or winding down"
    elif track.tempo < 80 and track.valence >= 0.4:
        use_case = "a relaxed Sunday morning"
    elif track.tempo >= 80 and track.energy > 0.6 and track.valence > 0.5:
        use_case = "workouts or high-energy moments"
    elif track.tempo >= 100 and track.valence > 0.6:
        use_case = "a feel-good road trip"
    else:
        use_case = "focused work or background listening"

    # Composer prefix
    composer_prefix = ""
    if cm.get("composer"):
        composer_prefix = f"A {cm['composer']} composition. "
    elif cm.get("film_name"):
        composer_prefix = f"From '{cm['film_name']}'. "

    return (
        f"{composer_prefix}"
        f"{tempo_desc.capitalize()} {track.genre.lower() or 'track'} with "
        f"{energy_desc} production. "
        f"The {key_feel}, creating a {mood_desc} atmosphere. "
        f"Well suited for {use_case}."
    )


async def get_description(track: EnrichedTrack) -> str:
    """Try Ollama first, fall back to template."""
    desc = await generate_description_ollama(track)
    if desc:
        return desc
    return generate_description_template(track)
