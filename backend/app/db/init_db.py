"""Database initialization — enables pgvector extension and creates all tables."""

from __future__ import annotations

from sqlalchemy import text

from app.core.logging import get_logger
from app.db.session import Base, engine

log = get_logger(__name__)


async def init_db() -> None:
    """
    Bootstrap the database on application startup.

    Steps:
    1. Enable the pgvector extension (idempotent — safe to run on every startup).
    2. Create all SQLAlchemy-mapped tables that don't already exist.
    """
    async with engine.begin() as conn:
        log.info("Enabling pgvector extension")
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))

        log.info("Creating database tables")
        # Import models to ensure they are registered with Base.metadata
        import app.db.models  # noqa: F401

        await conn.run_sync(Base.metadata.create_all)

    log.info("Database initialisation complete")


async def drop_db() -> None:
    """
    Drop all tables — ONLY use in test teardown.
    Never call this in production code.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    log.warning("All database tables dropped")
