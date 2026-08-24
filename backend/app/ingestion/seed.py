from __future__ import annotations

from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.db.models import Document
from app.ingestion.embedder import Embedder
from app.ingestion.pipeline import ingest_path

log = get_logger(__name__)

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"

CATEGORY_MAP: dict[str, str] = {
    "fighters": "fighters",
    "events": "events",
    "history": "history",
    "rules": "rules",
}


async def _document_exists(session: AsyncSession, source: str) -> bool:
    """Return True if a document with this source path is already in the DB."""
    result = await session.execute(
        select(Document.id).where(Document.source == source).limit(1),
    )
    return result.scalar_one_or_none() is not None


async def seed_knowledge_base(
    session: AsyncSession,
    embedder: Embedder,
    force: bool = False,
) -> dict[str, int]:
    """Ingest all seed documents from the data/ directory into the vector store."""
    if not DATA_DIR.exists():
        log.error("Data directory not found", path=str(DATA_DIR))
        return {}

    counts: dict[str, int] = {}

    for category, subdir in CATEGORY_MAP.items():
        category_dir = DATA_DIR / subdir
        if not category_dir.exists():
            log.warning("Seed category directory missing", path=str(category_dir))
            counts[category] = 0
            continue

        files = sorted(
            list(category_dir.glob("*.md")) + list(category_dir.glob("*.txt")),
        )

        if not files:
            log.info("No seed files found in category", category=category)
            counts[category] = 0
            continue

        counts[category] = 0
        for file_path in files:
            source = str(file_path.resolve())

            if not force and await _document_exists(session, source):
                log.debug("Skipping already-ingested seed file", file=file_path.name)
                continue

            try:
                await ingest_path(
                    path=file_path,
                    category=category,
                    source_type="seed",
                    metadata={"category": category},
                    session=session,
                    embedder=embedder,
                )
                counts[category] += 1
                log.info(
                    "Seed file ingested",
                    file=file_path.name,
                    category=category,
                )
            except Exception:
                log.exception(
                    "Failed to ingest seed file — skipping",
                    file=str(file_path),
                )

    total = sum(counts.values())
    log.info("Seed ingestion complete", total=total, by_category=counts)
    return counts
