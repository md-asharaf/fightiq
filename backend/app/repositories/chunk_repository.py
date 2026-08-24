import uuid
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import Chunk
from app.repositories.base_repository import BaseRepository
from app.core.logging import get_logger

log = get_logger(__name__)
from app.repositories.base_repository import BaseRepository

class ChunkRepository(BaseRepository[Chunk]):
    def __init__(self, session: AsyncSession):
        super().__init__(Chunk, session)

    async def add_chunks(self, chunks: list[Chunk]) -> None:
        """Add multiple chunks to the database."""
        self.session.add_all(chunks)
        # Flush is sufficient here, let the caller commit the entire transaction (e.g. IngestionService adding Document + Chunks)
        await self.session.flush()

    async def similarity_search(
        self,
        query_embedding: list[float],
        k: int = 5,
        category: str | None = None,
        fighter: str | None = None,
        document_ids: list[uuid.UUID] | None = None,
    ) -> list[tuple[Chunk, float]]:
        """Perform cosine similarity search over the chunks table using pgvector."""
        distance_col = Chunk.embedding.cosine_distance(query_embedding).label("distance")
        stmt = select(Chunk, distance_col)

        conditions = [Chunk.embedding.is_not(None)]

        if category:
            conditions.append(Chunk.metadata_["category"].astext == category)
        if fighter:
            conditions.append(Chunk.metadata_["fighter"].astext == fighter)
        if document_ids:
            conditions.append(Chunk.document_id.in_(document_ids))

        stmt = stmt.where(and_(*conditions))
        stmt = stmt.order_by(distance_col).limit(k)

        result = await self.session.execute(stmt)
        rows = result.all()

        log.debug(
            "Similarity search completed",
            k=k,
            results_found=len(rows),
            category=category,
            fighter=fighter,
        )
        return [(row.Chunk, float(row.distance)) for row in rows]

    async def similarity_search_with_scores(
        self,
        query_embedding: list[float],
        k: int = 5,
        **filter_kwargs,
    ) -> list[dict]:
        """Convenience wrapper that returns dicts instead of ORM objects."""
        results = await self.similarity_search(
            query_embedding=query_embedding,
            k=k,
            **filter_kwargs,
        )

        return [
            {
                "content": chunk.content,
                "score": round(1.0 - distance, 4),
                "chunk_id": str(chunk.id),
                "document_id": str(chunk.document_id),
                "chunk_index": chunk.chunk_index,
                "metadata": chunk.metadata_ or {},
            }
            for chunk, distance in results
        ]
