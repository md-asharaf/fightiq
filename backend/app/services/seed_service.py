from __future__ import annotations

from pathlib import Path

from app.core.logging import get_logger
from app.repositories.document_repository import DocumentRepository
from app.services.ingestion_service import IngestionService

log = get_logger(__name__)

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"

CATEGORY_MAP: dict[str, str] = {
    "fighters": "fighters",
    "events": "events",
    "history": "history",
    "rules": "rules",
}


class SeedService:
    def __init__(
        self,
        doc_repo: DocumentRepository,
        ingestion_service: IngestionService,
    ):
        self.doc_repo = doc_repo
        self.ingestion_service = ingestion_service

    async def seed_knowledge_base(self, force: bool = False) -> dict[str, int]:
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

                if not force and await self.doc_repo.document_exists(source):
                    log.debug("Skipping already-ingested seed file", file=file_path.name)
                    continue

                try:
                    await self.ingestion_service.ingest_path(
                        path=file_path,
                        category=category,
                        source_type="seed",
                        metadata={"category": category},
                    )
                    counts[category] += 1
                    log.info(
                        "Seed file ingested",
                        file=file_path.name,
                        category=category,
                    )
                except Exception:
                    await self.doc_repo.rollback()
                    log.exception(
                        "Failed to ingest seed file — skipping",
                        file=str(file_path),
                    )

        total = sum(counts.values())
        log.info("Seed ingestion complete", total=total, by_category=counts)
        return counts
