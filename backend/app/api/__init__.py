from __future__ import annotations

from fastapi import APIRouter

from app.api import chat, documents, eval, ingest, quiz

router = APIRouter(prefix="/api")

router.include_router(ingest.router, prefix="/ingest", tags=["Ingestion"])
router.include_router(documents.router, prefix="/documents", tags=["Documents"])
router.include_router(chat.router, prefix="/chat", tags=["Chat"])
router.include_router(quiz.router, prefix="/quiz", tags=["Quiz"])
router.include_router(eval.router, prefix="/eval", tags=["Evaluation"])
