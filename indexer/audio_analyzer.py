"""Audio feature extraction using librosa."""
import os
import numpy as np
from concurrent.futures import ProcessPoolExecutor

import librosa

DURATION = int(os.getenv("ANALYSIS_DURATION", "30"))

KEYS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]


def analyze_audio(file_path: str) -> dict:
    """
    Extract audio features from a music file.
    Runs in a separate process (CPU-bound).
    """
    try:
        y, sr = librosa.load(file_path, duration=DURATION, mono=True)

        # Tempo (BPM)
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        tempo = float(np.atleast_1d(tempo)[0])

        # Energy (RMS normalized 0–1)
        rms = float(np.mean(librosa.feature.rms(y=y)))
        energy = min(rms * 10, 1.0)

        # Valence proxy — spectral centroid brightness
        centroid = float(np.mean(librosa.feature.spectral_centroid(y=y, sr=sr)))
        valence = min(centroid / 4000.0, 1.0)

        # Key detection
        chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
        key_idx = int(np.argmax(np.mean(chroma, axis=1)))

        # Mode (major/minor)
        tonnetz = librosa.feature.tonnetz(y=y, sr=sr)
        mode = "major" if float(np.mean(tonnetz[1])) > 0 else "minor"

        return {
            "tempo":   round(tempo, 1),
            "energy":  round(energy, 3),
            "valence": round(valence, 3),
            "key":     f"{KEYS[key_idx]} {mode}",
        }

    except Exception as e:
        return {
            "tempo":   0.0,
            "energy":  0.0,
            "valence": 0.5,
            "key":     "Unknown",
            "error":   str(e),
        }


async def analyze_batch(
    file_paths: list[str],
    workers:    int = 4,
) -> list[dict]:
    """Analyze multiple files in parallel using ProcessPoolExecutor."""
    import asyncio
    loop = asyncio.get_running_loop()
    with ProcessPoolExecutor(max_workers=workers) as executor:
        tasks = [loop.run_in_executor(executor, analyze_audio, fp) for fp in file_paths]
        results = await asyncio.gather(*tasks, return_exceptions=True)

    return [
        r if isinstance(r, dict) else {
            "tempo": 0.0, "energy": 0.0, "valence": 0.5, "key": "Unknown",
            "error": str(r),
        }
        for r in results
    ]
