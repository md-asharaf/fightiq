from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from fastapi.responses import StreamingResponse

from app.core.dependencies import get_ingestion_service, get_seed_service, require_admin
from app.core.exceptions import ValidationError
from app.core.logging import get_logger
from app.core.rate_limit import limiter
from app.db.auth_models import User
from app.schemas.document import IngestResponse, IngestScrapeRequest, IngestSeedRequest
from app.services.ingestion_service import IngestionService
from app.services.seed_service import SeedService

log = get_logger(__name__)
router = APIRouter()

IngestionServiceDep = Annotated[IngestionService, Depends(get_ingestion_service)]
SeedServiceDep = Annotated[SeedService, Depends(get_seed_service)]


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
    seed_service: SeedServiceDep,
    admin: User = Depends(require_admin),
) -> IngestResponse:
    log.info("Seed ingestion endpoint triggered", force=request.force)

    counts = await seed_service.seed_knowledge_base(force=request.force)
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
    ingestion_service: IngestionServiceDep,
    file: UploadFile = File(description="Document to ingest (.txt, .md, .pdf, .json)"),
    category: str = Form(
        default="general",
        description="Knowledge category: fighters | events | history | rules | general",
    ),
    admin: User = Depends(require_admin),
) -> IngestResponse:
    try:
        content = await file.read()
        doc = await ingestion_service.ingest_bytes(
            content=content,
            filename=file.filename or "",
            category=category,
        )
        return IngestResponse(
            message=f"'{file.filename}' ingested successfully.",
            documents_created=1,
            chunks_created=doc.chunk_count,
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY
            if "Invalid" in str(e) or "Unsupported" in str(e)
            else status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post(
    "/scrape",
    summary="Scrape Wikipedia or URLs and ingest (SSE Stream)",
    description=(
        "Streams Server-Sent Events (SSE) detailing the progress of scraping "
        "and embedding each topic/URL into the vector store."
    ),
)
@limiter.limit("5/minute")
async def ingest_scrape(
    request: Request,
    payload: IngestScrapeRequest,
    ingestion_service: IngestionServiceDep,
    admin: User = Depends(require_admin),
):
    log.info("Scrape requested", topics=payload.topics, category=payload.category)

    event_generator = ingestion_service.scrape_and_ingest_stream(
        topics=payload.topics,
        category=payload.category,
    )

    return StreamingResponse(event_generator, media_type="text/event-stream")
