from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    QDRANT_HOST:      str = "localhost"
    QDRANT_PORT:      int = 6333
    OLLAMA_HOST:      str = "http://localhost:11434"
    OLLAMA_MODEL:     str = "gemma2:9b"
    NAVIDROME_URL:        str = "http://localhost:4533"
    NAVIDROME_PUBLIC_URL: str = "http://localhost:4533"
    NAVIDROME_USER:   str = "admin"
    NAVIDROME_PASS:   str = "admin"
    REDIS_URL:        str = "redis://localhost:6379"
    POSTGRES_URL:     str = "postgresql://driftwave:driftwave@localhost:5432/driftwave"
    JWT_SECRET:       str = "change-me"
    JWT_ALGORITHM:    str = "HS256"
    JWT_EXPIRE_MINS:  int = 60 * 24 * 7  # 7 days
    ENV:              str = "production"

    class Config:
        env_file = ".env"

settings = Settings()

TEXT_COLLECTION  = "driftwave_text"
AUDIO_COLLECTION = "driftwave_audio"
