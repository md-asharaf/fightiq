from __future__ import annotations

from fastapi import APIRouter

from app.api import chat, documents, eval, ingest, quiz

router = APIRouter()

router.include_router(ingest.router, prefix="/api/ingest", tags=["Ingestion"])
router.include_router(documents.router, prefix="/api/documents", tags=["Documents"])
router.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
router.include_router(quiz.router, prefix="/api/quiz", tags=["Quiz"])
router.include_router(eval.router, prefix="/api/eval", tags=["Evaluation"])
