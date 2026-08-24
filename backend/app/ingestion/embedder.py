"""Embedding provider using Google's text-embedding-004 model via LangChain."""

from __future__ import annotations

from langchain_google_genai import GoogleGenerativeAIEmbeddings

from app.core.config import settings
from app.core.logging import get_logger

log = get_logger(__name__)


class Embedder:
    """
    Wraps GoogleGenerativeAIEmbeddings for both batch and single-query embedding.

    This class is instantiated once at startup (singleton via dependencies.py)
    and injected into ingestion and RAG routes.

    Model: text-embedding-004 (768 dimensions, Google's best general embedding).
    """

    def __init__(self) -> None:
        self._model = GoogleGenerativeAIEmbeddings(
            model=settings.embedding_model,
            google_api_key=settings.google_api_key,
            task_type="retrieval_document",  # optimal for document indexing
        )
        self._query_model = GoogleGenerativeAIEmbeddings(
            model=settings.embedding_model,
            google_api_key=settings.google_api_key,
            task_type="retrieval_query",  # optimal for query embedding
        )
        log.info(
            "Embedder initialised",
            model=settings.embedding_model,
            dimensions=settings.embedding_dimensions,
        )

    async def aembed_documents(self, texts: list[str]) -> list[list[float]]:
        """Embed a batch of documents asynchronously (for ingestion)."""
        return await self._model.aembed_documents(texts)

    async def aembed_query(self, query: str) -> list[float]:
        """Embed a single search query asynchronously (for retrieval)."""
        return await self._query_model.aembed_query(query)

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        """Synchronous batch embedding (for compatibility)."""
        return self._model.embed_documents(texts)

    def embed_query(self, query: str) -> list[float]:
        """Synchronous single-query embedding (for compatibility)."""
        return self._query_model.embed_query(query)

    @property
    def langchain_embeddings(self) -> GoogleGenerativeAIEmbeddings:
        """Expose the raw LangChain embeddings for chains that require it."""
        return self._model
