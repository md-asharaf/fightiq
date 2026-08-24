"""API v1 router — aggregates all v1 sub-routers."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.documents import router as documents_router
from app.api.v1.ingest import router as ingest_router

router = APIRouter()

router.include_router(ingest_router, prefix="/ingest", tags=["Ingestion"])
router.include_router(documents_router, prefix="/documents", tags=["Documents"])
