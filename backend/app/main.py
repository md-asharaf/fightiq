from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from app.core.logging import configure_logging

configure_logging()

from app.core.logging import get_logger

log = get_logger(__name__)

from fastapi import FastAPI 
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.session import engine


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    """FastAPI lifespan context manager — runs once on startup and shutdown."""
    log.info("FightIQ backend starting up", environment=settings.environment)

    from app.core.dependencies import set_embedder
    from app.ingestion.embedder import Embedder

    embedder = Embedder()
    set_embedder(embedder)

    from app.db.session import AsyncSessionLocal
    from app.ingestion.seed import seed_knowledge_base

    async with AsyncSessionLocal() as session:
        counts = await seed_knowledge_base(session=session, embedder=embedder, force=False)
        total_seeded = sum(counts.values())
        if total_seeded:
            log.info("Seed data ingested on startup", total=total_seeded, by_category=counts)
        else:
            log.info("Knowledge base already seeded — no new documents added")

    log.info("FightIQ backend ready to serve requests")
    yield

    log.info("FightIQ backend shutting down")
    await engine.dispose()
    log.info("Database connection pool disposed")


app = FastAPI(
    title="FightIQ API",
    description=(
        "UFC GenAI Knowledge & Quiz Platform.\n\n"
        "Demonstrates: RAG, embeddings, pgvector, LangChain, Gemini API, "
        "structured LLM output, streaming responses, quiz generation, "
        "and AI evaluation."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.backend_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api import router

app.include_router(router)


@app.get("/health", tags=["Health"], summary="Health check")
async def health() -> dict:
    """Returns service health status."""
    return {
        "status": "ok",
        "version": "1.0.0",
        "environment": settings.environment,
        "service": "fightiq-backend",
    }
