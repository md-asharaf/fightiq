"""
Custom pgvector-backed similarity search using SQLAlchemy.

Implements cosine distance search directly against our 'chunks' table,
giving full control over the query, metadata filtering, and result shaping.
This avoids driver-compatibility issues from langchain-postgres while
demonstrating direct pgvector competency.
"""

from __future__ import annotations

import uuid

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.db.models import Chunk

log = get_logger(__name__)


async def similarity_search(
    session: AsyncSession,
    query_embedding: list[float],
    k: int = 5,
    category: str | None = None,
    fighter: str | None = None,
    document_ids: list[uuid.UUID] | None = None,
) -> list[tuple[Chunk, float]]:
    """
    Perform cosine similarity search over the chunks table using pgvector.

    Uses pgvector's <=> operator (cosine distance) via the SQLAlchemy
    pgvector integration. Results are ordered ascending by distance
    (lower = more similar).

    Args:
        session: Async DB session.
        query_embedding: The query vector (768-dim for text-embedding-004).
        k: Maximum number of results to return.
        category: Optional filter — only return chunks from this category.
        fighter: Optional filter — only return chunks mentioning this fighter
                 (matched against metadata JSON).
        document_ids: Optional allowlist of document IDs to search within.

    Returns:
        List of (Chunk, cosine_distance) tuples, ordered by distance ascending.
    """
    # Build the SELECT with computed distance column
    distance_col = Chunk.embedding.cosine_distance(query_embedding).label("distance")
    stmt = select(Chunk, distance_col)

    # ── Metadata filters ──────────────────────────────────────────────────────
    conditions = [Chunk.embedding.is_not(None)]  # exclude un-embedded chunks

    if category:
        conditions.append(Chunk.metadata_["category"].astext == category)
    if fighter:
        conditions.append(Chunk.metadata_["fighter"].astext == fighter)
    if document_ids:
        conditions.append(Chunk.document_id.in_(document_ids))

    stmt = stmt.where(and_(*conditions))

    # Order by cosine distance and limit
    stmt = stmt.order_by(distance_col).limit(k)

    result = await session.execute(stmt)
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
    session: AsyncSession,
    query_embedding: list[float],
    k: int = 5,
    **filter_kwargs,
) -> list[dict]:
    """
    Convenience wrapper that returns dicts instead of ORM objects.

    Converts cosine distance to a 0–1 similarity score
    (score = 1 - distance, so 1.0 = identical, 0.0 = orthogonal).
    """
    results = await similarity_search(
        session=session,
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
