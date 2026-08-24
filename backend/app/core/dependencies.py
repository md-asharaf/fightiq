from __future__ import annotations

from collections.abc import AsyncGenerator

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
from app.db.auth_models import Session as AuthSession
from app.db.auth_models import User
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


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> User | None:
    token = request.cookies.get("better-auth.session_token")
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

    if not token:
        return None

    stmt = select(User).join(AuthSession, User.id == AuthSession.userId).where(AuthSession.token == token)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


def require_auth(user: User | None = Depends(get_current_user)) -> User:
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )
    return user


def get_chat_llm() -> BaseChatModel:
    return ChatGoogleGenerativeAI(
        model=settings.llm_model,
        google_api_key=SecretStr(settings.google_api_key),
        max_output_tokens=1024,
        streaming=True,
    )


def get_fast_llm() -> BaseChatModel:
    from langchain_groq import ChatGroq
    return ChatGroq(
        model=settings.groq_model,
        api_key=SecretStr(settings.groq_api_key) if settings.groq_api_key else None,
        max_tokens=1024,
    )


def get_search_provider(
    session: AsyncSession = Depends(get_db),
    embedder: Embedder = Depends(get_embedder),
    llm: BaseChatModel = Depends(get_fast_llm),
) -> IWebSearchProvider:
    from app.utils.tools import ExaSearchProvider
    from app.repositories.tool_cache_repository import ToolCacheRepository
    from app.repositories.knowledge_graph_repository import KnowledgeGraphRepository
    
    cache_repo = ToolCacheRepository(session=session)
    kg_repo = KnowledgeGraphRepository(session=session)
    
    return ExaSearchProvider(
        settings.exa_api_key, 
        cache_repo=cache_repo, 
        kg_repo=kg_repo, 
        embedder=embedder, 
        llm=llm
    )


def get_search_tools(
    provider: IWebSearchProvider = Depends(get_search_provider),
    db: AsyncSession = Depends(get_db)
) -> list[BaseTool]:
    normal_tool_cached = StructuredTool.from_function(
        coroutine=lambda query: provider.search(query, "keyword", 3, use_cache=True),
        name="normal_web_search",
        description="Search the web for quick, real-time facts (e.g. recent fights, stats, news). Uses a 24-hour cache for speed. Use this when the knowledge base lacks information.",
    )
    normal_tool_realtime = StructuredTool.from_function(
        coroutine=lambda query: provider.search(query, "keyword", 3, use_cache=False),
        name="realtime_web_search",
        description="Bypasses the cache to search the web for to-the-minute breaking news or live updates. ONLY use this if the user specifically requests breaking news or live updates.",
    )
    deep_tool = StructuredTool.from_function(
        coroutine=lambda query: provider.search(query, "neural", 5, use_cache=True),
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
        )
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


def get_agent_factory(
    db: AsyncSession = Depends(get_db),
    embedder: Embedder = Depends(get_embedder),
    llm: BaseChatModel = Depends(get_chat_llm),
    search_tools: list[BaseTool] = Depends(get_search_tools),
):
    from app.services.agent_factory import AgentFactory
    return AgentFactory(db=db, embedder=embedder, llm=llm, search_tools=search_tools)

def get_chat_service(
    repo: IChatRepository = Depends(get_chat_repository),
    agent_factory = Depends(get_agent_factory),
):
    from app.services.chat_service import ChatService
    return ChatService(
        chat_repository=repo, agent_factory=agent_factory
    )


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
    return EvalService(eval_repository=repo, db=db, embedder=embedder, llm=llm, agent_factory=agent_factory)


def get_quiz_repository(session: AsyncSession = Depends(get_db)) -> IQuizRepository:
    from app.repositories.quiz_repository import QuizRepository
    return QuizRepository(session=session)
    
def get_chunk_repository(session: AsyncSession = Depends(get_db)):
    from app.repositories.chunk_repository import ChunkRepository
    return ChunkRepository(session=session)

def get_quiz_service(
    repo: IQuizRepository = Depends(get_quiz_repository),
    chunk_repo = Depends(get_chunk_repository),
    embedder: Embedder = Depends(get_embedder),
    llm: BaseChatModel = Depends(get_fast_llm),
):
    from app.services.quiz_service import QuizService
    return QuizService(quiz_repository=repo, chunk_repository=chunk_repo, embedder=embedder, llm=llm)


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
