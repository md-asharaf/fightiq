from __future__ import annotations

import logging
from collections.abc import AsyncGenerator
from datetime import UTC

from fastapi import Depends, HTTPException, Request, status
from langchain_core.language_models import BaseChatModel
from langchain_core.tools import BaseTool, StructuredTool
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import SecretStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.interfaces import (
    IChatRepository,
    IDocumentRepository,
    IEvalRepository,
    IQuizRepository,
    IWebSearchProvider,
)
from app.db.auth_models import User
from app.db.session import AsyncSessionLocal
from app.utils.embedder import Embedder

log = logging.getLogger(__name__)


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


async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> User | None:
    token = request.cookies.get("better-auth.session_token") or request.cookies.get(
        "__Secure-better-auth.session_token"
    )
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

    if not token:
        return None

    from datetime import datetime

    from app.db.auth_models import Session

    stmt = (
        select(User)
        .join(Session, User.id == Session.userId)
        .where(
            Session.token == token,
            Session.expiresAt > datetime.now(UTC).replace(tzinfo=None)
        )
    )

    try:
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        if user:
            return user
    except Exception as e:
        log.error(f"Error validating session from DB: {e}")

    log.warning("Auth failed: Token invalid or expired")
    return None


def require_auth(user: User | None = Depends(get_current_user)) -> User:
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )
    return user


def require_admin(user: User = Depends(require_auth)) -> User:
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return user


def get_chat_llm() -> BaseChatModel:
    from langchain_groq import ChatGroq

    primary_llm = ChatGoogleGenerativeAI(
        model=settings.gemini_model,
        google_api_key=SecretStr(settings.google_api_key),
        max_output_tokens=4096,
        streaming=True,
        max_retries=2,
    )

    # Secondary Google Model
    fallback_google = ChatGoogleGenerativeAI(
        model=settings.gemini_fallback_model,
        google_api_key=SecretStr(settings.google_api_key),
        max_output_tokens=4096,
        streaming=True,
        max_retries=1,
    )

    # Primary Groq Model
    fallback_groq_1 = ChatGroq(
        model_name=settings.groq_model,
        api_key=SecretStr(settings.groq_api_key) if settings.groq_api_key else None,
        max_tokens=4096,
        streaming=True,
        max_retries=1,
    )

    # Secondary Groq Model
    fallback_groq_2 = ChatGroq(
        model_name=settings.groq_fallback_model,
        api_key=SecretStr(settings.groq_api_key) if settings.groq_api_key else None,
        max_tokens=4096,
        streaming=True,
        max_retries=1,
    )

    return primary_llm.with_fallbacks([fallback_google, fallback_groq_1, fallback_groq_2])  # type: ignore


def get_fast_llm() -> BaseChatModel:
    from langchain_groq import ChatGroq

    primary_llm = ChatGroq(
        model_name=settings.groq_model,
        api_key=SecretStr(settings.groq_api_key) if settings.groq_api_key else None,
        max_tokens=4096,
        max_retries=2,
    )

    # Secondary Groq Model
    fallback_groq = ChatGroq(
        model_name=settings.groq_fallback_model,
        api_key=SecretStr(settings.groq_api_key) if settings.groq_api_key else None,
        max_tokens=4096,
        max_retries=1,
    )

    # Secondary Google Model (Optimized for speed)
    fallback_google_1 = ChatGoogleGenerativeAI(
        model=settings.gemini_fallback_model,
        google_api_key=SecretStr(settings.google_api_key),
        max_output_tokens=4096,
        max_retries=1,
    )

    # Primary Google Model (Heavy)
    fallback_google_2 = ChatGoogleGenerativeAI(
        model=settings.gemini_model,
        google_api_key=SecretStr(settings.google_api_key),
        max_output_tokens=4096,
        max_retries=1,
    )

    return primary_llm.with_fallbacks([fallback_groq, fallback_google_1, fallback_google_2])  # type: ignore


def get_search_provider(
    session: AsyncSession = Depends(get_db),
    embedder: Embedder = Depends(get_embedder),
) -> IWebSearchProvider:
    from app.repositories.tool_cache_repository import ToolCacheRepository
    from app.utils.tools import ExaSearchProvider

    cache_repo = ToolCacheRepository(session=session)

    return ExaSearchProvider(
        settings.exa_api_key,
        cache_repo=cache_repo,
        embedder=embedder,
        db=session,
    )


def get_search_tools(
    provider: IWebSearchProvider = Depends(get_search_provider), db: AsyncSession = Depends(get_db)
) -> list[BaseTool]:
    async def normal_cached_search(query: str) -> str:
        return await provider.search(query, "keyword", 3, use_cache=True)

    normal_tool_cached = StructuredTool.from_function(
        coroutine=normal_cached_search,
        name="normal_web_search",
        description="Search the web for quick, real-time facts (e.g. recent fights, stats, news). Uses a 24-hour cache for speed. Use this when the knowledge base lacks information.",
    )

    async def normal_realtime_search(query: str) -> str:
        return await provider.search(query, "keyword", 3, use_cache=False)

    normal_tool_realtime = StructuredTool.from_function(
        coroutine=normal_realtime_search,
        name="realtime_web_search",
        description="Bypasses the cache to search the web for to-the-minute breaking news or live updates. ONLY use this if the user specifically requests breaking news or live updates.",
    )

    async def deep_cached_search(query: str) -> str:
        return await provider.search(query, "neural", 5, use_cache=True)

    deep_tool = StructuredTool.from_function(
        coroutine=deep_cached_search,
        name="deep_web_search",
        description="Search the web deeply for complex questions requiring extensive context or synthesis. Uses a 24-hour cache.",
    )

    from app.services.database_tool_service import DatabaseToolService

    db_tool_service = DatabaseToolService(db)

    sql_tool = StructuredTool.from_function(
        coroutine=db_tool_service.execute_query,
        name="query_database",
        description=(
            "Execute a raw SQL SELECT query against the structured knowledge graph to get exact stats or math.\n"
            "The database contains these tables:\n"
            "- fighters (id, name, nickname, weight_class, wins, losses, draws, is_champion, title_defenses, championships, win_streak, team, stance, height_cm, reach_cm, slpm, str_acc, sapm, str_def, td_avg, td_acc, td_def, sub_avg, last_updated)\n"
            "- events (id, name, date, location, last_updated)\n"
            "Use standard PostgreSQL syntax. NEVER run updates or deletes."
        ),
    )

    return [sql_tool, normal_tool_cached, normal_tool_realtime, deep_tool]


def get_retriever(
    session: AsyncSession = Depends(get_db),
    embedder: Embedder = Depends(get_embedder),
):
    from app.utils.retriever import UFCRetriever

    return UFCRetriever(session=session, embedder=embedder)


def get_chat_repository(session: AsyncSession = Depends(get_db)) -> IChatRepository:
    from app.repositories.chat_repository import ChatRepository

    return ChatRepository(session=session)


def get_chunk_repository(session: AsyncSession = Depends(get_db)):
    from app.repositories.chunk_repository import ChunkRepository

    return ChunkRepository(session=session)


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


def get_ingestion_service(
    doc_repo: IDocumentRepository = Depends(get_document_repository),
    chunk_repo=Depends(get_chunk_repository),
    embedder: Embedder = Depends(get_embedder),
    db: AsyncSession = Depends(get_db),
):
    from app.services.ingestion_service import IngestionService

    return IngestionService(doc_repo=doc_repo, chunk_repo=chunk_repo, embedder=embedder, db=db)


def get_agent_factory(
    db: AsyncSession = Depends(get_db),
    embedder: Embedder = Depends(get_embedder),
    llm: BaseChatModel = Depends(get_chat_llm),
    search_tools: list[BaseTool] = Depends(get_search_tools),
    ingestion_service=Depends(get_ingestion_service),
):
    from app.services.agent_factory import AgentFactory

    return AgentFactory(
        db=db,
        embedder=embedder,
        llm=llm,
        search_tools=search_tools,
        ingestion_service=ingestion_service
    )


def get_chat_service(
    repo: IChatRepository = Depends(get_chat_repository),
    agent_factory=Depends(get_agent_factory),
    db: AsyncSession = Depends(get_db),
):
    from app.services.chat_service import ChatService

    return ChatService(chat_repository=repo, agent_factory=agent_factory, db=db)


def get_eval_repository(session: AsyncSession = Depends(get_db)) -> IEvalRepository:
    from app.repositories.eval_repository import EvalRepository

    return EvalRepository(session=session)


def get_eval_service(
    repo: IEvalRepository = Depends(get_eval_repository),
    db: AsyncSession = Depends(get_db),
    embedder: Embedder = Depends(get_embedder),
    llm: BaseChatModel = Depends(get_fast_llm),
    agent_factory=Depends(get_agent_factory),
):
    from app.services.eval_service import EvalService

    return EvalService(
        eval_repository=repo, db=db, embedder=embedder, llm=llm, agent_factory=agent_factory
    )


def get_quiz_repository(session: AsyncSession = Depends(get_db)) -> IQuizRepository:
    from app.repositories.quiz_repository import QuizRepository

    return QuizRepository(session=session)


def get_quiz_service(
    repo: IQuizRepository = Depends(get_quiz_repository),
    chunk_repo=Depends(get_chunk_repository),
    embedder: Embedder = Depends(get_embedder),
    llm: BaseChatModel = Depends(get_fast_llm),
    db: AsyncSession = Depends(get_db),
):
    from app.services.quiz_service import QuizService

    return QuizService(
        quiz_repository=repo, chunk_repository=chunk_repo, embedder=embedder, llm=llm, db=db
    )


