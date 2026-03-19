from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    MUSIC_DIR:        str = "/mnt/e/Music_Test"
    QDRANT_HOST:      str = "localhost"
    QDRANT_PORT:      int = 6333
    OLLAMA_HOST:      str = "http://localhost:11434"
    OLLAMA_MODEL:     str = "gemma2:9b"
    NAVIDROME_URL:    str = "http://localhost:4533"
    NAVIDROME_USER:   str = "admin"
    NAVIDROME_PASS:   str = "admin"
    REDIS_URL:        str = "redis://localhost:6379"
    POSTGRES_URL:     str = "postgresql://driftwave:driftwave@localhost:5432/driftwave"
    LIBROSA_WORKERS:  int = 4
    ANALYSIS_DURATION: int = 30
    GENIUS_KEY:       str = ""
    ACOUSTID_KEY:     str = ""
    TMDB_API_KEY:     str = ""
    MODELS_DIR:       str = "/models"

    class Config:
        env_file = ".env"

settings = Settings()

SUPPORTED_EXTENSIONS = {".mp3", ".flac", ".ogg", ".m4a", ".wav", ".opus", ".aac"}

TEXT_COLLECTION  = "driftwave_text"   # 384-dim sentence-transformers
AUDIO_COLLECTION = "driftwave_audio"  # 512-dim CLAP
