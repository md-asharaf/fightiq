from __future__ import annotations

from fastapi import APIRouter

from app.api import admin, chat, document, eval, fighter, ingest, public, quiz

router = APIRouter(prefix="/api")

router.include_router(ingest.router, prefix="/ingest", tags=["Ingestion"])
router.include_router(document.router, prefix="/documents", tags=["Documents"])
router.include_router(chat.router, prefix="/chat", tags=["Chat"])
router.include_router(quiz.router, prefix="/quiz", tags=["Quiz"])
router.include_router(eval.router, prefix="/eval", tags=["Evaluation"])
router.include_router(fighter.router, prefix="/fighters", tags=["Fighters"])
router.include_router(public.router,prefix="/public", tags=["Public"])
router.include_router(admin.router, prefix="/admin", tags=["Admin"])
