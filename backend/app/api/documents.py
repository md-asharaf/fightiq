import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.core.dependencies import get_document_service
from app.schemas.chunk import SimilaritySearchRequest, SimilaritySearchResponse
from app.schemas.document import DocumentListResponse, DocumentRead
from app.services.document_service import DocumentService

router = APIRouter()

@router.get(
    "",
    response_model=DocumentListResponse,
    summary="List all ingested documents",
    description="Returns a paginated list of all active documents in the knowledge base.",
)
async def list_documents(
    document_service: Annotated[DocumentService, Depends(get_document_service)],
    category: Annotated[str | None, Query(description="Filter by category")] = None,
    source_type: Annotated[str | None, Query(description="Filter by source type")] = None,
    page: Annotated[int, Query(ge=1, description="Page number (1-indexed)")] = 1,
    page_size: Annotated[int, Query(ge=1, le=100, description="Items per page")] = 20,
) -> DocumentListResponse:
    return await document_service.list_documents(category, source_type, page, page_size)


@router.get(
    "/{document_id}",
    response_model=DocumentRead,
    summary="Get a document by ID",
)
async def get_document(
    document_id: uuid.UUID,
    document_service: Annotated[DocumentService, Depends(get_document_service)],
) -> DocumentRead:
    return await document_service.get_document(document_id)


@router.delete(
    "/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Soft-delete a document",
    description="Sets is_active=False. Chunks remain in the DB but are excluded from search.",
)
async def delete_document(
    document_id: uuid.UUID,
    document_service: Annotated[DocumentService, Depends(get_document_service)],
) -> None:
    await document_service.delete_document(document_id)


@router.post(
    "/search",
    response_model=SimilaritySearchResponse,
    summary="Semantic similarity search",
    description=(
        "Embed a query and return the most semantically similar chunks "
        "from the knowledge base. Useful for debugging retrieval quality."
    ),
)
async def semantic_search(
    request: SimilaritySearchRequest,
    document_service: Annotated[DocumentService, Depends(get_document_service)],
) -> SimilaritySearchResponse:
    return await document_service.search(request)
