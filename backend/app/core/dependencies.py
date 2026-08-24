"""FastAPI dependency providers — DB sessions, embedder, retriever."""

from __future__ import annotations

from collections.abc import AsyncGenerator

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal
from app.ingestion.embedder import Embedder

_embedder: Embedder | None = None


def set_embedder(embedder: Embedder) -> None:
    global _embedder
    _embedder = embedder


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield an async SQLAlchemy session for the duration of the request.

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
    """Return the singleton Embedder instance."""
    if _embedder is None:
        raise RuntimeError(
            "Embedder has not been initialised. "
            "Ensure the FastAPI lifespan context manager has run.",
        )
    return _embedder


def get_retriever(
    session: AsyncSession = Depends(get_db),
    embedder: Embedder = Depends(get_embedder),
):
    """Return a UFCRetriever bound to the current request's DB session."""
    from app.rag.retriever import UFCRetriever

    return UFCRetriever(session=session, embedder=embedder)
