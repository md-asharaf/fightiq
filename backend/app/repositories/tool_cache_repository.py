import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import SemanticToolCache
from app.repositories.base_repository import BaseRepository


class ToolCacheRepository(BaseRepository[SemanticToolCache]):
    def __init__(self, session: AsyncSession):
        super().__init__(SemanticToolCache, session)

    async def get_cached_response(
        self, query_embedding: list[float], tool_name: str, distance_threshold: float, hours: int
    ) -> str | None:
        """Find a cached response using semantic similarity."""
        cutoff_time = datetime.datetime.now(datetime.UTC) - datetime.timedelta(hours=hours)

        # Use pgvector's <=> operator for cosine distance
        stmt = (
            select(SemanticToolCache)
            .where(
                SemanticToolCache.tool_name == tool_name,
                SemanticToolCache.created_at >= cutoff_time,
                SemanticToolCache.query_embedding.cosine_distance(query_embedding)
                < distance_threshold,
            )
            .order_by(SemanticToolCache.query_embedding.cosine_distance(query_embedding))
            .limit(1)
        )

        result = await self.session.execute(stmt)
        cache_entry = result.scalar_one_or_none()

        if cache_entry:
            return cache_entry.result_payload
        return None

    async def save_response(
        self, query: str, query_embedding: list[float], tool_name: str, payload: str
    ) -> SemanticToolCache:
        """Save a new tool response to the cache."""
        new_cache = SemanticToolCache(
            query=query,
            query_embedding=query_embedding,
            tool_name=tool_name,
            result_payload=payload,
        )
        self.session.add(new_cache)
        await (
            self.session.flush()
        )  # Flush to get ID if needed, but don't commit here. Let caller commit.
        return new_cache
