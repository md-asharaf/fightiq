from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from app.core.dependencies import get_embedder, get_document_repository, get_chunk_repository
from app.core.logging import get_logger
from app.schemas.document import IngestResponse, IngestScrapeRequest, IngestSeedRequest
from app.services.ingestion_service import ingest_bytes, ingest_text
from app.utils.embedder import Embedder


log = get_logger(__name__)
router = APIRouter()

_ALLOWED_EXTENSIONS = {".txt", ".md", ".pdf", ".json"}
_MAX_FILE_SIZE = 10 * 1024 * 1024
_VALID_CATEGORIES = {"fighters", "events", "history", "rules", "general"}


@router.post(
    "/seed",
    response_model=IngestResponse,
    summary="Ingest curated seed documents",
    description=(
        "Loads all curated UFC markdown files from the data/ directory "
        "into the vector store. Idempotent — already-ingested documents are "
        "skipped unless force=true."
    ),
)
async def ingest_seed(
    request: IngestSeedRequest,
    doc_repo = Depends(get_document_repository),
    chunk_repo = Depends(get_chunk_repository),
    embedder: Embedder = Depends(get_embedder),
) -> IngestResponse:
    from app.services.seed_service import seed_knowledge_base
    log.info("Seed ingestion endpoint triggered", force=request.force)
    
    counts = await seed_knowledge_base(
        doc_repo=doc_repo,
        chunk_repo=chunk_repo,
        embedder=embedder,
        force=request.force,
    )
    total = sum(counts.values())

    return IngestResponse(
        message=f"Seed ingestion complete. {total} documents ingested.",
        documents_created=total,
        chunks_created=0,
    )


@router.post(
    "/file",
    response_model=IngestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload and ingest a UFC knowledge document",
    description=(
        "Accepts .txt, .md, .pdf, or .json files. "
        "The document is chunked, embedded, and stored in the vector database. "
        "Maximum file size: 10 MB."
    ),
)
async def ingest_file(
    file: UploadFile = File(description="Document to ingest (.txt, .md, .pdf, .json)"),
    category: str = Form(
        default="general",
        description="Knowledge category: fighters | events | history | rules | general",
    ),
    doc_repo = Depends(get_document_repository),
    chunk_repo = Depends(get_chunk_repository),
    embedder: Embedder = Depends(get_embedder),
) -> IngestResponse:
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is required.",
        )

    ext = Path(file.filename).suffix.lower()
    if ext not in _ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unsupported file type '{ext}'. Allowed: {sorted(_ALLOWED_EXTENSIONS)}",
        )

    if category not in _VALID_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid category '{category}'. Allowed: {sorted(_VALID_CATEGORIES)}",
        )

    content = await file.read()

    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    if len(content) > _MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size: {_MAX_FILE_SIZE // (1024 * 1024)} MB.",
        )

    log.info(
        "File upload received",
        filename=file.filename,
        size_bytes=len(content),
        category=category,
    )


    doc = await ingest_bytes(
        content=content,
        filename=file.filename,
        category=category,
        source_type="upload",
        metadata={"original_filename": file.filename, "category": category},
        doc_repo=doc_repo,
        chunk_repo=chunk_repo,
        embedder=embedder,
    )

    return IngestResponse(
        message=f"'{file.filename}' ingested successfully.",
        documents_created=1,
        chunks_created=doc.chunk_count,
    )


@router.post(
    "/scrape",
    summary="Scrape Wikipedia or URLs and ingest (SSE Stream)",
    description=(
        "Streams Server-Sent Events (SSE) detailing the progress of scraping "
        "and embedding each topic/URL into the vector store."
    ),
)
async def ingest_scrape(
    request: IngestScrapeRequest,
    doc_repo = Depends(get_document_repository),
    chunk_repo = Depends(get_chunk_repository),
    embedder: Embedder = Depends(get_embedder),
):
    from app.services.ingestion_service import scrape_and_ingest_stream
    log.info("Scrape requested", topics=request.topics, category=request.category)
    
    event_generator = scrape_and_ingest_stream(
        topics=request.topics,
        category=request.category,
        doc_repo=doc_repo,
        chunk_repo=chunk_repo,
        embedder=embedder,
    )

    return StreamingResponse(event_generator, media_type="text/event-stream")
