"""
LangChain-compatible retriever backed by our custom pgvector similarity search.

Implements the LangChain BaseRetriever protocol, making this retriever
drop-in compatible with any LangChain chain, agent, or LCEL pipeline
(used in Phase 2 for the conversational RAG chain).
"""

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
from app.ingestion.embedder import Embedder
from app.rag.vectorstore import similarity_search

log = get_logger(__name__)


class UFCRetriever(BaseRetriever):
    """
    Retrieves relevant UFC knowledge chunks for a natural-language query.

    Supports metadata filtering by category and fighter name, enabling
    targeted retrieval (e.g., 'only search fighter profiles').

    This retriever is LangChain-native: it can be used as the retriever
    argument to ConversationalRetrievalChain, RetrievalQA, or any LCEL pipe.
    """

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
        """
        Synchronous retrieval — raises NotImplementedError.

        We are an async-first FastAPI application; sync retrieval is not
        supported to avoid blocking the event loop.
        """
        raise NotImplementedError(
            "UFCRetriever is async-only. Use aget_relevant_documents()."
        )

    async def _aget_relevant_documents(
        self,
        query: str,
        *,
        run_manager: AsyncCallbackManagerForRetrieverRun,
    ) -> list[LCDocument]:
        """
        Async retrieval pipeline:
          1. Embed the query using the retrieval_query task type.
          2. Execute cosine similarity search against the chunks table.
          3. Convert results to LangChain Document objects with rich metadata.
        """
        log.debug("Retriever querying", query_preview=query[:100], k=self.k)

        # Step 1: Embed query
        query_embedding = await self.embedder.aembed_query(query)

        # Step 2: Vector search with optional filters
        chunks_with_distances = await similarity_search(
            session=self.session,
            query_embedding=query_embedding,
            k=self.k,
            category=self.category,
            fighter=self.fighter,
        )

        # Step 3: Convert to LangChain Documents
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
                )
            )

        log.info(
            "Retriever returned results",
            query_preview=query[:80],
            num_docs=len(lc_docs),
        )
        return lc_docs
