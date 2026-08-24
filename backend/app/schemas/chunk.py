"""Pydantic schemas for Chunk resources and similarity search."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ChunkRead(BaseModel):
    """Response schema for a single Chunk."""

    id: uuid.UUID
    document_id: uuid.UUID
    content: str
    chunk_index: int
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def _normalize_from_orm(cls, data: Any) -> Any:
        """Remap ORM `metadata_` → API `metadata`."""
        if hasattr(data, "metadata_"):
            return {
                "id": data.id,
                "document_id": data.document_id,
                "content": data.content,
                "chunk_index": data.chunk_index,
                "metadata": data.metadata_ or {},
                "created_at": data.created_at,
            }
        return data


class SimilaritySearchRequest(BaseModel):
    """Request body for vector similarity search."""

    query: str = Field(..., min_length=1, max_length=1000)
    k: int = Field(default=5, ge=1, le=20)
    category: str | None = Field(
        default=None,
        pattern=r"^(fighters|events|history|rules|general)$",
    )
    fighter: str | None = None


class SimilaritySearchResult(BaseModel):
    """A single result from a similarity search."""

    content: str
    score: float = Field(description="Similarity score (0–1, higher is more similar)")
    chunk_id: uuid.UUID
    document_id: uuid.UUID
    chunk_index: int
    metadata: dict[str, Any] = Field(default_factory=dict)


class SimilaritySearchResponse(BaseModel):
    """Response from a similarity search query."""

    query: str
    results: list[SimilaritySearchResult]
    total_found: int
