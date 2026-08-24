"""FastAPI dependency providers — DB sessions, embedder, retriever."""

from __future__ import annotations

from collections.abc import AsyncGenerator

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal
from app.ingestion.embedder import Embedder

# ── Singleton Embedder ─────────────────────────────────────────────────────────
# Initialised once in the FastAPI lifespan (app/main.py) and stored here.
# This avoids recreating expensive model-client objects per request.
_embedder: Embedder | None = None


def set_embedder(embedder: Embedder) -> None:
    """Register the Embedder singleton. Called once from the app lifespan."""
    global _embedder
    _embedder = embedder


# ── Dependency functions ───────────────────────────────────────────────────────

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Yield an async SQLAlchemy session for the duration of the request.

    Rolls back on exception, closes on exit.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


def get_embedder() -> Embedder:
    """
    Return the singleton Embedder instance.

    Raises RuntimeError if called before the app lifespan has run
    (which would be a programming error, not a user error).
    """
    if _embedder is None:
        raise RuntimeError(
            "Embedder has not been initialised. "
            "Ensure the FastAPI lifespan context manager has run."
        )
    return _embedder


def get_retriever(
    session: AsyncSession = Depends(get_db),
    embedder: Embedder = Depends(get_embedder),
):
    """
    Return a UFCRetriever bound to the current request's DB session.

    Importing here to avoid circular imports at module level.
    """
    from app.rag.retriever import UFCRetriever

    return UFCRetriever(session=session, embedder=embedder)
