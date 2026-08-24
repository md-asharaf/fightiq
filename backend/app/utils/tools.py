import asyncio
import datetime
import uuid

from langchain_exa import ExaSearchRetriever
from langchain_core.language_models import BaseChatModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.tool_cache_repository import ToolCacheRepository
from app.repositories.knowledge_graph_repository import KnowledgeGraphRepository

from app.db.models import SemanticToolCache
from app.utils.embedder import Embedder
from app.core.logging import get_logger

log = get_logger(__name__)


class ExaSearchProvider:
    """Concrete implementation of IWebSearchProvider using Exa and Semantic Cache."""

    def __init__(self, api_key: str, cache_repo: ToolCacheRepository, kg_repo: KnowledgeGraphRepository, embedder: Embedder, llm: BaseChatModel):
        self.api_key = api_key
        self.cache_repo = cache_repo
        self.kg_repo = kg_repo
        self.embedder = embedder
        self.llm = llm

    async def search(self, query: str, search_type: str, num_results: int = 3, use_cache: bool = True) -> str:
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
                    hours=24
                )
                if cached_payload:
                    log.info(f"Semantic Cache HIT for query: {query}")
                    return cached_payload
                log.info(f"Semantic Cache MISS for query: {query}")
            except Exception as e:
                log.warning(f"Failed to check semantic cache: {e}")
                query_embedding = None

        # 2. Perform actual search
        retriever = ExaSearchRetriever(
            exa_api_key=self.api_key,
            type=search_type, # 'neural' or 'keyword'
            use_autoprompt=True,
            num_results=num_results,
        )
        
        # ExaSearchRetriever supports ainvoke
        docs = await retriever.ainvoke(query)
        
        payload = "\n\n".join(f"Title: {d.metadata.get('title')}\nSource: {d.metadata.get('url')}\nContent: {d.page_content}" for d in docs)

        # 3. Store in cache
        if use_cache:
            if query_embedding is None:
                query_embedding = await self.embedder.aembed_query(query)
            try:
                await self.cache_repo.save_response(
                    query=query,
                    query_embedding=query_embedding,
                    tool_name=search_type,
                    payload=payload
                )
                await self.cache_repo.commit()
            except Exception as e:
                log.warning(f"Failed to save to semantic cache: {e}")
                await self.cache_repo.rollback()

        # 4. Trigger background extraction
        from app.services.knowledge_extractor import KnowledgeExtractor
        extractor = KnowledgeExtractor(repo=self.kg_repo, llm=self.llm)
        asyncio.create_task(extractor.extract_and_ingest(query, payload))

        return payload
