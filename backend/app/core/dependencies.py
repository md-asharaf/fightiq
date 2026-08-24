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


def get_chat_repository(session: AsyncSession = Depends(get_db)):
    from app.repositories.chat_repository import ChatRepository
    return ChatRepository(session=session)


def get_chat_service(
    repo=Depends(get_chat_repository),
    db: AsyncSession = Depends(get_db),
    embedder: Embedder = Depends(get_embedder),
):
    from app.services.chat_service import ChatService
    return ChatService(chat_repository=repo, db=db, embedder=embedder)


def get_eval_repository(session: AsyncSession = Depends(get_db)):
    from app.repositories.eval_repository import EvalRepository
    return EvalRepository(session=session)


def get_eval_service(
    repo=Depends(get_eval_repository),
    db: AsyncSession = Depends(get_db),
    embedder: Embedder = Depends(get_embedder),
):
    from app.services.eval_service import EvalService
    return EvalService(eval_repository=repo, db=db, embedder=embedder)


def get_quiz_repository(session: AsyncSession = Depends(get_db)):
    from app.repositories.quiz_repository import QuizRepository
    return QuizRepository(session=session)


def get_quiz_service(
    repo=Depends(get_quiz_repository),
    db: AsyncSession = Depends(get_db),
    embedder: Embedder = Depends(get_embedder),
):
    from app.services.quiz_service import QuizService
    return QuizService(quiz_repository=repo, db=db, embedder=embedder)


def get_document_repository(session: AsyncSession = Depends(get_db)):
    from app.repositories.document_repository import DocumentRepository
    return DocumentRepository(session=session)


def get_document_service(
    repo=Depends(get_document_repository),
    db: AsyncSession = Depends(get_db),
    embedder: Embedder = Depends(get_embedder),
):
    from app.services.document_service import DocumentService
    return DocumentService(document_repository=repo, db=db, embedder=embedder)
