import asyncio
import sys
from pathlib import Path

# Add the backend directory to sys.path so 'app' can be imported when running as a script
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from app.core.logging import configure_logging, get_logger
from app.db.session import AsyncSessionLocal
from app.repositories.chunk_repository import ChunkRepository
from app.repositories.document_repository import DocumentRepository
from app.services.ingestion_service import IngestionService
from app.services.seed_service import SeedService
from app.utils.embedder import Embedder

configure_logging()
log = get_logger(__name__)


async def seed() -> None:
    """Script to manually seed the knowledge base."""
    log.info("Starting knowledge base seed process...")
    embedder = Embedder()

    async with AsyncSessionLocal() as session:
        doc_repo = DocumentRepository(session=session)
        chunk_repo = ChunkRepository(session=session)
        ingestion_service = IngestionService(
            doc_repo=doc_repo, chunk_repo=chunk_repo, embedder=embedder, db=session
        )
        seed_service = SeedService(
            doc_repo=doc_repo, ingestion_service=ingestion_service, db=session
        )

        counts = await seed_service.seed_knowledge_base(force=False)
        total_seeded = sum(counts.values())

        if total_seeded:
            log.info("Seed data ingested successfully", total=total_seeded, by_category=counts)
        else:
            log.info("Knowledge base already seeded — no new documents added")


if __name__ == "__main__":
    asyncio.run(seed())
