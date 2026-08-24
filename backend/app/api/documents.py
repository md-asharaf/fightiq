"""Document listing, retrieval, and management endpoints."""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, get_embedder
from app.core.logging import get_logger
from app.db.models import Document
from app.ingestion.embedder import Embedder
from app.rag.vectorstore import similarity_search_with_scores
from app.schemas.chunk import (
    SimilaritySearchRequest,
    SimilaritySearchResponse,
    SimilaritySearchResult,
)
from app.schemas.document import DocumentListResponse, DocumentRead

log = get_logger(__name__)
router = APIRouter()

_VALID_CATEGORIES = {"fighters", "events", "history", "rules", "general"}
_VALID_SOURCE_TYPES = {"seed", "upload", "scraped"}


@router.get(
    "",
    response_model=DocumentListResponse,
    summary="List all ingested documents",
    description="Returns a paginated list of all active documents in the knowledge base.",
)
async def list_documents(
    db: Annotated[AsyncSession, Depends(get_db)],
    category: Annotated[str | None, Query(description="Filter by category")] = None,
    source_type: Annotated[str | None, Query(description="Filter by source type")] = None,
    page: Annotated[int, Query(ge=1, description="Page number (1-indexed)")] = 1,
    page_size: Annotated[int, Query(ge=1, le=100, description="Items per page")] = 20,
) -> DocumentListResponse:
    base_stmt = select(Document).where(Document.is_active.is_(True))

    if category:
        if category not in _VALID_CATEGORIES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid category. Allowed: {sorted(_VALID_CATEGORIES)}",
            )
        base_stmt = base_stmt.where(Document.category == category)

    if source_type:
        if source_type not in _VALID_SOURCE_TYPES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid source_type. Allowed: {sorted(_VALID_SOURCE_TYPES)}",
            )
        base_stmt = base_stmt.where(Document.source_type == source_type)

    count_stmt = select(func.count()).select_from(base_stmt.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    paginated_stmt = (
        base_stmt.order_by(Document.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    rows = (await db.execute(paginated_stmt)).scalars().all()

    return DocumentListResponse(
        items=[DocumentRead.model_validate(doc) for doc in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/{document_id}",
    response_model=DocumentRead,
    summary="Get a document by ID",
)
async def get_document(
    document_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DocumentRead:
    doc = await db.get(Document, document_id)
    if not doc or not doc.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{document_id}' not found.",
        )
    return DocumentRead.model_validate(doc)


@router.delete(
    "/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Soft-delete a document",
    description="Sets is_active=False. Chunks remain in the DB but are excluded from search.",
)
async def delete_document(
    document_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    doc = await db.get(Document, document_id)
    if not doc or not doc.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{document_id}' not found.",
        )
    doc.is_active = False
    await db.commit()
    log.info("Document soft-deleted", document_id=str(document_id), title=doc.title)


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
    db: Annotated[AsyncSession, Depends(get_db)],
    embedder: Annotated[Embedder, Depends(get_embedder)],
) -> SimilaritySearchResponse:
    log.info("Semantic search requested", query=request.query[:80])

    query_embedding = await embedder.aembed_query(request.query)
    results = await similarity_search_with_scores(
        session=db,
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
