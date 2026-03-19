"""
Database setup — async SQLAlchemy engine + table definitions.
Provides init_db() called once at startup to create tables.
"""
from datetime import datetime

from sqlalchemy import String, Float, Integer, DateTime, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from config import settings

# Convert postgresql:// → postgresql+asyncpg://
_db_url = settings.POSTGRES_URL.replace(
    "postgresql://", "postgresql+asyncpg://", 1
)

engine = create_async_engine(_db_url, echo=False)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class IndexedTrack(Base):
    """Tracks which files have been indexed and their metadata."""
    __tablename__ = "indexed_tracks"

    id:          Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    file_path:   Mapped[str] = mapped_column(String(1024), unique=True, nullable=False, index=True)
    title:       Mapped[str] = mapped_column(String(512), default="")
    artist:      Mapped[str] = mapped_column(String(512), default="")
    album:       Mapped[str] = mapped_column(String(512), default="")
    language:    Mapped[str] = mapped_column(String(16),  default="")
    adapter:     Mapped[str] = mapped_column(String(64),  default="default")
    duration:    Mapped[int] = mapped_column(Integer,     default=0)
    indexed_at:  Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class IndexJob(Base):
    """Log of indexing runs."""
    __tablename__ = "index_jobs"

    id:         Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    total:      Mapped[int] = mapped_column(Integer, default=0)
    success:    Mapped[int] = mapped_column(Integer, default=0)
    errors:     Mapped[int] = mapped_column(Integer, default=0)
    status:     Mapped[str] = mapped_column(String(32), default="running")


async def init_db():
    """Create all tables if they don't exist."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
