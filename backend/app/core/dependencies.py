from __future__ import annotations

from collections.abc import AsyncGenerator

from fastapi import Depends
from langchain_core.language_models import BaseChatModel
from langchain_core.tools import BaseTool, StructuredTool
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import SecretStr
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.interfaces import (
    IChatRepository,
    IDocumentRepository,
    IEvalRepository,
    IQuizRepository,
    IWebSearchProvider,
)
from app.db.session import AsyncSessionLocal
from app.utils.embedder import Embedder

_embedder: Embedder | None = None


def set_embedder(embedder: Embedder) -> None:
    global _embedder
    _embedder = embedder


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


def get_embedder() -> Embedder:
    if _embedder is None:
        raise RuntimeError(
            "Embedder has not been initialised. "
            "Ensure the FastAPI lifespan context manager has run.",
        )
    return _embedder


def get_llm() -> BaseChatModel:
    return ChatGoogleGenerativeAI(
        model=settings.llm_model,
        google_api_key=SecretStr(settings.google_api_key),
        max_output_tokens=1024,
    )


def get_search_provider() -> IWebSearchProvider:
    from app.utils.tools import ExaSearchProvider
    return ExaSearchProvider(settings.exa_api_key)


def get_search_tools(provider: IWebSearchProvider = Depends(get_search_provider)) -> list[BaseTool]:
    normal_tool = StructuredTool.from_function(
        func=lambda query: provider.search(query, "keyword", 3),
        name="normal_web_search",
        description="Search the web for quick, real-time facts (e.g. recent fights, stats, news). Use this when the knowledge base lacks information on recent events or general web knowledge.",
    )
    deep_tool = StructuredTool.from_function(
        func=lambda query: provider.search(query, "neural", 5),
        name="deep_web_search",
        description="Search the web deeply for complex questions requiring extensive context, historical analysis, or synthesis across multiple sources. Use this only when normal_web_search is insufficient.",
    )
    return [normal_tool, deep_tool]


def get_retriever(
    session: AsyncSession = Depends(get_db),
    embedder: Embedder = Depends(get_embedder),
):
    from app.utils.retriever import UFCRetriever
    return UFCRetriever(session=session, embedder=embedder)


def get_chat_repository(session: AsyncSession = Depends(get_db)) -> IChatRepository:
    from app.repositories.chat_repository import ChatRepository
    return ChatRepository(session=session)


def get_chat_service(
    repo: IChatRepository = Depends(get_chat_repository),
    db: AsyncSession = Depends(get_db),
    embedder: Embedder = Depends(get_embedder),
    llm: BaseChatModel = Depends(get_llm),
    search_tools: list[BaseTool] = Depends(get_search_tools),
):
    from app.services.chat_service import ChatService
    return ChatService(
        chat_repository=repo, db=db, embedder=embedder, llm=llm, search_tools=search_tools
    )


def get_eval_repository(session: AsyncSession = Depends(get_db)) -> IEvalRepository:
    from app.repositories.eval_repository import EvalRepository
    return EvalRepository(session=session)


def get_eval_service(
    repo: IEvalRepository = Depends(get_eval_repository),
    db: AsyncSession = Depends(get_db),
    embedder: Embedder = Depends(get_embedder),
    llm: BaseChatModel = Depends(get_llm),
    chat_service=Depends(get_chat_service),
):
    from app.services.eval_service import EvalService
    return EvalService(eval_repository=repo, db=db, embedder=embedder, llm=llm, chat_service=chat_service)


def get_quiz_repository(session: AsyncSession = Depends(get_db)) -> IQuizRepository:
    from app.repositories.quiz_repository import QuizRepository
    return QuizRepository(session=session)


def get_quiz_service(
    repo: IQuizRepository = Depends(get_quiz_repository),
    db: AsyncSession = Depends(get_db),
    embedder: Embedder = Depends(get_embedder),
    llm: BaseChatModel = Depends(get_llm),
):
    from app.services.quiz_service import QuizService
    return QuizService(quiz_repository=repo, db=db, embedder=embedder, llm=llm)


def get_document_repository(session: AsyncSession = Depends(get_db)) -> IDocumentRepository:
    from app.repositories.document_repository import DocumentRepository
    return DocumentRepository(session=session)


def get_document_service(
    repo: IDocumentRepository = Depends(get_document_repository),
    db: AsyncSession = Depends(get_db),
    embedder: Embedder = Depends(get_embedder),
):
    from app.services.document_service import DocumentService
    return DocumentService(document_repository=repo, db=db, embedder=embedder)
