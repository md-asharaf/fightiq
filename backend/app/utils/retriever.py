from __future__ import annotations

from langchain_core.callbacks import (
    AsyncCallbackManagerForRetrieverRun,
    CallbackManagerForRetrieverRun,
)
from langchain_core.documents import Document as LCDocument
from langchain_core.retrievers import BaseRetriever
from pydantic import ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.repositories.chunk_repository import ChunkRepository
from app.utils.embedder import Embedder

log = get_logger(__name__)


class UFCRetriever(BaseRetriever):
    """Retrieves relevant UFC knowledge chunks for a natural-language query."""

    model_config = ConfigDict(arbitrary_types_allowed=True)

    session: AsyncSession
    embedder: Embedder
    k: int = 5
    category: str | None = None
    fighter: str | None = None

    def _get_relevant_documents(
        self,
        query: str,
        *,
        run_manager: CallbackManagerForRetrieverRun,
    ) -> list[LCDocument]:
        """Synchronous retrieval fallback."""
        import asyncio

        return asyncio.run(
            self._aget_relevant_documents(query, run_manager=run_manager)  # type: ignore[arg-type]
        )

    async def _aget_relevant_documents(
        self,
        query: str,
        *,
        run_manager: AsyncCallbackManagerForRetrieverRun,
    ) -> list[LCDocument]:
        """Async retrieval pipeline"""
        log.debug("Retriever querying", query_preview=query[:100], k=self.k)

        query_embedding = await self.embedder.aembed_query(query)
        chunk_repo = ChunkRepository(session=self.session)

        chunks_with_distances = await chunk_repo.similarity_search(
            query_embedding=query_embedding,
            k=self.k,
            category=self.category,
            fighter=self.fighter,
        )

        lc_docs: list[LCDocument] = []
        for chunk, distance in chunks_with_distances:
            lc_docs.append(
                LCDocument(
                    page_content=chunk.content,
                    metadata={
                        "chunk_id": str(chunk.id),
                        "document_id": str(chunk.document_id),
                        "chunk_index": chunk.chunk_index,
                        "similarity_score": round(1.0 - distance, 4),
                        **(chunk.metadata_ or {}),
                    },
                ),
            )

        log.info(
            "Retriever returned results",
            query_preview=query[:80],
            num_docs=len(lc_docs),
        )
        return lc_docs
