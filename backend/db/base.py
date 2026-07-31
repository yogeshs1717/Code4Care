"""Async SQLAlchemy session factory.

A single module-level async engine is created from settings. The engine's
connect-args vary by database type so SQLite works out of the box locally and
PostgreSQL works in production (Render).
"""
from __future__ import annotations

from collections.abc import AsyncIterator
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from backend.config import get_settings


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


def utcnow() -> datetime:
    """Current UTC time, tz-aware. Storage layer (SQLite) strips tzinfo."""
    return datetime.now(timezone.utc)


def as_utc(value: datetime) -> datetime:
    """Normalize a stored datetime to tz-aware UTC regardless of dialect.

    SQLite returns naive UTC datetimes; PostgreSQL returns tz-aware ones.
    Comparing against an aware `utcnow()` directly would raise on SQLite.
    """
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _engine_kwargs(url: str) -> dict:
    if url.startswith("sqlite"):
        return {"connect_args": {"check_same_thread": False}}
    return {}


settings = get_settings()
_url = settings.resolved_database_url
engine = create_async_engine(_url, echo=False, **_engine_kwargs(_url))

SessionFactory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_db() -> AsyncIterator[AsyncSession]:
    """FastAPI dependency yielding an async session bound to the request."""
    async with SessionFactory() as session:
        yield session


async def init_db() -> None:
    """Create tables on startup. Fine for MVP; Alembic migrations come later."""
    from backend.db import models  # noqa: F401  (register models on Base)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
