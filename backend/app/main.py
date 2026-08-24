from __future__ import annotations

import traceback
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from app.core.database import engine
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.exceptions import ResourceNotFoundError, ValidationError
from app.core.logging import configure_logging, get_logger

configure_logging()
log = get_logger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    """FastAPI lifespan context manager — runs once on startup and shutdown."""
    log.info("FightIQ backend starting up", environment=settings.environment)

    from app.core.dependencies import set_embedder
    from app.utils.embedder import Embedder

    embedder = Embedder()
    set_embedder(embedder)

    from app.db.session import AsyncSessionLocal
    from app.services.seed_service import seed_knowledge_base

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


@app.exception_handler(ResourceNotFoundError)
async def resource_not_found_handler(request: Request, exc: ResourceNotFoundError):
    return JSONResponse(
        status_code=404,
        content={"detail": exc.message}
    )

@app.exception_handler(ValidationError)
async def validation_error_handler(request: Request, exc: ValidationError):
    return JSONResponse(
        status_code=422,
        content={"detail": exc.message}
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "traceback": traceback.format_exc()}
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.backend_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api import router  # noqa: E402

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
