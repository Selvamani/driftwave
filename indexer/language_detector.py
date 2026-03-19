"""
Language detector — layered detection strategy.
Returns (language_code, confidence) tuple.
"""
import os
import re
from pathlib import Path
from typing import Optional

import fasttext

MODELS_DIR = os.getenv("MODELS_DIR", "/models")
_ft_model  = None

def _get_fasttext():
    global _ft_model
    if _ft_model is None:
        model_path = os.path.join(MODELS_DIR, "lid.176.bin")
        if os.path.exists(model_path):
            _ft_model = fasttext.load_model(model_path)
    return _ft_model

# ── Script Unicode ranges ─────────────────────────────

SCRIPT_RANGES = {
    "tamil":     [(0x0B80, 0x0BFF)],
    "hindi":     [(0x0900, 0x097F)],
    "telugu":    [(0x0C00, 0x0C7F)],
    "kannada":   [(0x0C80, 0x0CFF)],
    "malayalam": [(0x0D00, 0x0D7F)],
    "bengali":   [(0x0980, 0x09FF)],
    "punjabi":   [(0x0A00, 0x0A7F)],
    "arabic":    [(0x0600, 0x06FF)],
    "korean":    [(0xAC00, 0xD7A3), (0x1100, 0x11FF)],
    "japanese":  [(0x3040, 0x30FF), (0x4E00, 0x9FFF)],
    "chinese":   [(0x4E00, 0x9FFF), (0x3400, 0x4DBF)],
    "thai":      [(0x0E00, 0x0E7F)],
}

# ── Artist / composer knowledge base ─────────────────

ARTIST_LANG_DB: dict[str, str] = {
    # Tamil composers
    "ar rahman":             "tamil",
    "a.r. rahman":           "tamil",
    "a. r. rahman":          "tamil",
    "yuvan shankar raja":    "tamil",
    "yuvan":                 "tamil",
    "anirudh ravichander":   "tamil",
    "anirudh":               "tamil",
    "harris jayaraj":        "tamil",
    "d. imman":              "tamil",
    "ilaiyaraaja":           "tamil",
    "ilayaraja":             "tamil",
    "santhosh narayanan":    "tamil",
    "sid sriram":            "tamil",
    "gv prakash kumar":      "tamil",
    "gv prakash":            "tamil",
    "vijay antony":          "tamil",
    "deva":                  "tamil",
    "sabesh murali":         "tamil",
    "james vasanthan":       "tamil",
    "sean roldan":           "tamil",
    # Tamil vocalists
    "s.p. balasubrahmanyam": "tamil",
    "spb":                   "tamil",
    "k.j. yesudas":          "tamil",
    "chinmayi":               "tamil",
    "bombay jayashri":        "tamil",
    "tippu":                  "tamil",
    "benny dayal":            "tamil",

    # Hindi composers
    "pritam":                "hindi",
    "vishal-shekhar":        "hindi",
    "amit trivedi":          "hindi",
    "shankar ehsaan loy":    "hindi",
    "r.d. burman":           "hindi",
    "lata mangeshkar":       "hindi",
    "kishore kumar":         "hindi",
    "mithoon":               "hindi",
    "arijit singh":          "hindi",
    "atif aslam":            "hindi",

    # Telugu
    "s.s. thaman":           "telugu",
    "devi sri prasad":       "telugu",
    "m.m. keeravani":        "telugu",
    "thaman":                "telugu",

    # Malayalam
    "gopi sundar":           "malayalam",
    "m. jayachandran":       "malayalam",
    "berny ignatius":        "malayalam",

    # Korean
    "bts":                   "korean",
    "blackpink":             "korean",
    "exo":                   "korean",
    "iu":                    "korean",
    "aespa":                 "korean",
    "seventeen":             "korean",
    "nct":                   "korean",
    "twice":                 "korean",
    "stray kids":            "korean",
}

# ── Path hint keywords ────────────────────────────────

PATH_LANG_HINTS: dict[str, list[str]] = {
    "tamil":     ["tamil", "kollywood", "tamilsongs", "tamilvideo"],
    "hindi":     ["hindi", "bollywood", "hindisongs"],
    "telugu":    ["telugu", "tollywood"],
    "malayalam": ["malayalam", "mollywood"],
    "kannada":   ["kannada", "sandalwood"],
    "korean":    ["kpop", "k-pop", "korean"],
    "japanese":  ["jpop", "j-pop", "japanese", "anime"],
    "arabic":    ["arabic", "arab", "khaleeji"],
    "english":   ["english", "western"],
}

# fasttext code → adapter name
LANGDETECT_MAP: dict[str, str] = {
    "ta": "tamil", "hi": "hindi", "te": "telugu",
    "ml": "malayalam", "kn": "kannada", "ko": "korean",
    "ja": "japanese", "zh": "chinese", "ar": "arabic",
    "pa": "punjabi", "bn": "bengali", "en": "english",
    "fr": "french",  "es": "spanish", "pt": "portuguese",
    "de": "german",
}

# ── Detection functions ────────────────────────────────

def detect_from_script(tags: dict) -> Optional[str]:
    fields = [tags.get(k, "") for k in ("title", "artist", "album", "composer")]
    for text in fields:
        for char in str(text):
            cp = ord(char)
            for lang, ranges in SCRIPT_RANGES.items():
                if any(start <= cp <= end for start, end in ranges):
                    return lang
    return None

def detect_from_artist_db(tags: dict) -> Optional[str]:
    artist   = str(tags.get("artist",   "")).lower().strip()
    composer = str(tags.get("composer", "")).lower().strip()
    for field in [artist, composer]:
        if field in ARTIST_LANG_DB:
            return ARTIST_LANG_DB[field]
        for known, lang in ARTIST_LANG_DB.items():
            if known in field and len(known) > 3:
                return lang
    return None

def detect_from_path(file_path: str) -> Optional[str]:
    path_lower = file_path.lower()
    for lang, hints in PATH_LANG_HINTS.items():
        if any(hint in path_lower for hint in hints):
            return lang
    return None

def detect_from_lyrics(lyrics: str) -> Optional[str]:
    if not lyrics or len(lyrics.strip()) < 20:
        return None
    model = _get_fasttext()
    if model is None:
        return None
    try:
        clean = lyrics.replace("\n", " ").strip()
        preds, confs = model.predict(clean, k=1)
        code = preds[0].replace("__label__", "")
        conf = float(confs[0])
        if conf < 0.6:
            return None
        return LANGDETECT_MAP.get(code)
    except Exception:
        return None

# ── Main detector ─────────────────────────────────────

class LanguageDetector:
    def detect(self, tags: dict, file_path: str, lyrics: str = "") -> tuple[str, float]:
        """Returns (language, confidence 0.0–1.0)."""
        votes: dict[str, float] = {}

        # 1. Unicode script — highest confidence
        lang = detect_from_script(tags)
        if lang:
            votes[lang] = votes.get(lang, 0) + 1.0

        # 2. Artist DB
        lang = detect_from_artist_db(tags)
        if lang:
            votes[lang] = votes.get(lang, 0) + 0.9

        # 3. Path hints
        lang = detect_from_path(file_path)
        if lang:
            votes[lang] = votes.get(lang, 0) + 0.7

        # 4. Lyrics fasttext
        if lyrics:
            lang = detect_from_lyrics(lyrics)
            if lang:
                votes[lang] = votes.get(lang, 0) + 0.85

        if not votes:
            return ("default", 0.0)

        best = max(votes, key=votes.get)
        return (best, min(votes[best], 1.0))
