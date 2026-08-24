"""Pydantic request/response schemas for Document resources."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator


class DocumentRead(BaseModel):
    """Response schema for a single Document.

    Uses a model_validator to bridge the ORM attribute name `metadata_`
    to the public API field name `metadata`, avoiding any naming conflict
    with SQLAlchemy's reserved `Base.metadata` class attribute.
    """

    id: uuid.UUID
    title: str
    source: str
    category: str
    source_type: str
    chunk_count: int
    metadata: dict[str, Any] = Field(default_factory=dict)
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def _normalize_from_orm(cls, data: Any) -> Any:
        """When instantiated from an ORM object, remap `metadata_` → `metadata`.

        Pydantic's `from_attributes=True` mode accesses attributes by field name.
        Since the ORM column is `metadata_` (to avoid the SQLAlchemy Base.metadata
        conflict) but our API field is `metadata`, this validator bridges the gap.
        """
        if hasattr(data, "metadata_"):
            return {
                "id": data.id,
                "title": data.title,
                "source": data.source,
                "category": data.category,
                "source_type": data.source_type,
                "chunk_count": data.chunk_count,
                "metadata": data.metadata_ or {},
                "is_active": data.is_active,
                "created_at": data.created_at,
                "updated_at": data.updated_at,
            }
        return data


class DocumentListResponse(BaseModel):
    """Paginated list of documents."""

    items: list[DocumentRead]
    total: int
    page: int
    page_size: int


class IngestSeedRequest(BaseModel):
    """Request body for the seed ingestion endpoint."""

    force: bool = Field(
        default=False,
        description="Re-ingest documents even if they already exist",
    )


class IngestScrapeRequest(BaseModel):
    """Request body for Wikipedia scraping endpoint."""

    topics: list[str] = Field(
        ...,
        min_length=1,
        max_length=20,
        description="List of Wikipedia article titles to scrape and ingest",
    )
    category: str = Field(
        default="general",
        pattern=r"^(fighters|events|history|rules|general)$",
        description="Knowledge category to assign to scraped documents",
    )


class IngestResponse(BaseModel):
    """Response returned by all ingestion endpoints."""

    message: str
    documents_created: int
    chunks_created: int
