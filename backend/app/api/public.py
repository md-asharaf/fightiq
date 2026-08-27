from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.dependencies import get_chat_service
from app.schemas.chat import ChatHistory
from app.services.chat_service import ChatService

router = APIRouter()

@router.get("/chat/{share_id}", response_model=ChatHistory)
async def get_shared_chat(
    share_id: str,
    chat_service: Annotated[ChatService, Depends(get_chat_service)]
):
    """Retrieve a public chat session by its share ID."""
    return await chat_service.get_shared_history(share_id)
