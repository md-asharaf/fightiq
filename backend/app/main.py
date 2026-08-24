"""
FightIQ Backend — FastAPI application entry point.

Responsibilities:
  - Configure logging (must happen first, before any other app imports log).
  - Define the application lifespan (startup + shutdown).
  - Mount middleware (CORS).
  - Register routers.
  - Expose the health endpoint.
"""

from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

# ── Logging MUST be configured before any module that calls get_logger() ──────
from app.core.logging import configure_logging

configure_logging()

from app.core.logging import get_logger  # noqa: E402 (intentionally after configure)

log = get_logger(__name__)

from fastapi import FastAPI  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.db.init_db import init_db  # noqa: E402
from app.db.session import engine  # noqa: E402


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    FastAPI lifespan context manager — runs once on startup and shutdown.

    Startup sequence:
      1. Initialise PostgreSQL (enable pgvector extension, create tables).
      2. Instantiate the Embedder singleton and register it.
      3. Run idempotent seed data ingestion.

    Shutdown sequence:
      4. Dispose the SQLAlchemy connection pool.
    """
    log.info("FightIQ backend starting up", environment=settings.environment)

    # ── 1. Database ───────────────────────────────────────────────────────────
    await init_db()

    # ── 2. Embedder singleton ─────────────────────────────────────────────────
    from app.core.dependencies import set_embedder
    from app.ingestion.embedder import Embedder

    embedder = Embedder()
    set_embedder(embedder)

    # ── 3. Seed knowledge base ────────────────────────────────────────────────
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

    # ── Shutdown ──────────────────────────────────────────────────────────────
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

# ── Middleware ─────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.backend_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
from app.api import api_router  # noqa: E402

app.include_router(api_router)


# ── Built-in endpoints ─────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"], summary="Health check")
async def health() -> dict:
    """
    Returns service health status.
    Used by Docker health checks and load balancers.
    """
    return {
        "status": "ok",
        "version": "1.0.0",
        "environment": settings.environment,
        "service": "fightiq-backend",
    }
