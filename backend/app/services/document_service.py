import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ResourceNotFoundError, ValidationError
from app.core.interfaces import IDocumentRepository
from app.core.logging import get_logger
from app.schemas.chunk import (
    SimilaritySearchRequest,
    SimilaritySearchResponse,
    SimilaritySearchResult,
)
from app.schemas.document import DocumentListResponse, DocumentRead
from app.utils.embedder import Embedder
from app.utils.vectorstore import similarity_search_with_scores

log = get_logger(__name__)

_VALID_CATEGORIES = {"fighters", "events", "history", "rules", "general"}
_VALID_SOURCE_TYPES = {"seed", "upload", "scraped"}

class DocumentService:
    def __init__(self, document_repository: IDocumentRepository, db: AsyncSession, embedder: Embedder):
        self.repo = document_repository
        self.db = db
        self.embedder = embedder

    async def list_documents(self, category: str | None, source_type: str | None, page: int, page_size: int) -> DocumentListResponse:
        if category and category not in _VALID_CATEGORIES:
            raise ValidationError(f"Invalid category. Allowed: {sorted(_VALID_CATEGORIES)}")
        if source_type and source_type not in _VALID_SOURCE_TYPES:
            raise ValidationError(f"Invalid source_type. Allowed: {sorted(_VALID_SOURCE_TYPES)}")

        rows, total = await self.repo.get_documents(category, source_type, page, page_size)

        return DocumentListResponse(
            items=[DocumentRead.model_validate(doc) for doc in rows],
            total=total,
            page=page,
            page_size=page_size,
        )

    async def get_document(self, document_id: uuid.UUID) -> DocumentRead:
        doc = await self.repo.get_document(document_id)
        if not doc or not doc.is_active:
            raise ResourceNotFoundError(f"Document '{document_id}' not found.")
        return DocumentRead.model_validate(doc)

    async def delete_document(self, document_id: uuid.UUID) -> None:
        doc = await self.repo.get_document(document_id)
        if not doc or not doc.is_active:
            raise ResourceNotFoundError(f"Document '{document_id}' not found.")
        await self.repo.soft_delete(doc)
        await self.db.commit()
        log.info("Document soft-deleted", document_id=str(document_id), title=doc.title)

    async def search(self, request: SimilaritySearchRequest) -> SimilaritySearchResponse:
        log.info("Semantic search requested", query=request.query[:80])

        query_embedding = await self.embedder.aembed_query(request.query)
        results = await similarity_search_with_scores(
            session=self.db,
            query_embedding=query_embedding,
            k=request.k,
            category=request.category,
            fighter=request.fighter,
        )

        return SimilaritySearchResponse(
            query=request.query,
            results=[
                SimilaritySearchResult(
                    content=r["content"],
                    score=r["score"],
                    chunk_id=uuid.UUID(r["chunk_id"]),
                    document_id=uuid.UUID(r["document_id"]),
                    chunk_index=r["chunk_index"],
                    metadata=r["metadata"],
                )
                for r in results
            ],
            total_found=len(results),
        )
