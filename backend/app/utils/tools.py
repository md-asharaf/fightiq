
from arq.connections import ArqRedis
from langchain_core.language_models import BaseChatModel
from langchain_exa import ExaSearchRetriever
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.repositories.knowledge_graph_repository import KnowledgeGraphRepository
from app.repositories.tool_cache_repository import ToolCacheRepository
from app.utils.embedder import Embedder

log = get_logger(__name__)


class ExaSearchProvider:
    """Concrete implementation of IWebSearchProvider using Exa and Semantic Cache."""

    def __init__(
        self,
        api_key: str,
        cache_repo: ToolCacheRepository,
        kg_repo: KnowledgeGraphRepository,
        embedder: Embedder,
        llm: BaseChatModel,
        db: AsyncSession,
        redis_pool: ArqRedis,
    ):
        self.api_key = api_key
        self.cache_repo = cache_repo
        self.kg_repo = kg_repo
        self.embedder = embedder
        self.llm = llm
        self.db = db
        self.redis_pool = redis_pool

    async def search(
        self, query: str, search_type: str, num_results: int = 3, use_cache: bool = True
    ) -> str:
        """Search the web using Exa, checking the semantic cache first."""
        if not self.api_key:
            return "Search API key not configured. Web search is unavailable."

        # 1. Check cache if requested
        query_embedding = None
        if use_cache:
            try:
                query_embedding = await self.embedder.aembed_query(query)
                cached_payload = await self.cache_repo.get_cached_response(
                    query_embedding=query_embedding,
                    tool_name=search_type,
                    distance_threshold=0.15,
                    hours=24,
                )
                if cached_payload:
                    log.info(f"Semantic Cache HIT for query: {query}")
                    await self.db.commit()
                    return cached_payload
                log.info(f"Semantic Cache MISS for query: {query}")
            except Exception as e:
                log.warning(f"Failed to check semantic cache: {e}")
                query_embedding = None

        # Important: release the DB connection before blocking on Exa API regardless of cache usage
        await self.db.commit()

        retriever = ExaSearchRetriever(
            exa_api_key=self.api_key,
            type=search_type,
            use_autoprompt=True,
            num_results=num_results,
            text_contents_options={"highlights": True},
        )

        docs = await retriever.ainvoke(query)

        payload = "\n\n".join(
            f"Title: {d.metadata.get('title')}\nSource: {d.metadata.get('url')}\nContent: {d.page_content}"
            for d in docs
        )

        if use_cache:
            if query_embedding is None:
                query_embedding = await self.embedder.aembed_query(query)
            try:
                await self.cache_repo.save_response(
                    query=query,
                    query_embedding=query_embedding,
                    tool_name=search_type,
                    payload=payload,
                )
            except Exception as e:
                log.warning(f"Failed to save to semantic cache: {e}")
                await self.db.rollback()
            finally:
                await self.db.commit()

        try:
            await self.redis_pool.enqueue_job("extract_and_ingest_task", query, payload)
        except Exception as e:
            log.warning(f"Failed to enqueue extraction task: {e}")

        return payload
