from __future__ import annotations

from pathlib import Path

from app.repositories.document_repository import DocumentRepository
from app.repositories.chunk_repository import ChunkRepository

from app.core.logging import get_logger
from app.db.models import Document
from app.services.ingestion_service import ingest_path
from app.utils.embedder import Embedder

log = get_logger(__name__)

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"

CATEGORY_MAP: dict[str, str] = {
    "fighters": "fighters",
    "events": "events",
    "history": "history",
    "rules": "rules",
}


async def seed_knowledge_base(
    doc_repo: DocumentRepository,
    chunk_repo: ChunkRepository,
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

            if not force and await doc_repo.document_exists(source):
                log.debug("Skipping already-ingested seed file", file=file_path.name)
                continue

            try:
                await ingest_path(
                    path=file_path,
                    category=category,
                    source_type="seed",
                    metadata={"category": category},
                    doc_repo=doc_repo,
                    chunk_repo=chunk_repo,
                    embedder=embedder,
                )
                counts[category] += 1
                log.info(
                    "Seed file ingested",
                    file=file_path.name,
                    category=category,
                )
            except Exception:
                await doc_repo.rollback()
                log.exception(
                    "Failed to ingest seed file — skipping",
                    file=str(file_path),
                )

    total = sum(counts.values())
    log.info("Seed ingestion complete", total=total, by_category=counts)
    return counts
