import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status
from fastapi.responses import StreamingResponse

from app.core.dependencies import get_chat_service
from app.schemas.chat import ChatHistory, ChatRequest, ChatResponse
from app.services.chat_service import ChatService

router = APIRouter()

ChatServiceDep = Annotated[ChatService, Depends(get_chat_service)]

@router.post("/message")
async def chat_message(
    request: ChatRequest,
    chat_service: ChatServiceDep,
):
    """Send a message to the RAG chat system.
    Supports both streaming (SSE) and non-streaming responses.
    """
    session_id_str = request.session_id
    if session_id_str:
        try:
            uuid.UUID(session_id_str)
        except ValueError:
            session_id_str = str(uuid.uuid4())
    else:
        session_id_str = str(uuid.uuid4())
    response = await chat_service.process_message(
        session_id_str=session_id_str,
        message=request.message,
        stream=request.stream,
        filters=request.filters,
    )

    if request.stream:
        return StreamingResponse(response, media_type="text/event-stream")

    return ChatResponse(session_id=session_id_str, message=response)


@router.get("/history/{session_id}", response_model=ChatHistory)
async def get_chat_history(
    session_id: uuid.UUID,
    chat_service: ChatServiceDep,
):
    """Retrieve the conversation history for a given session."""
    return await chat_service.get_history(str(session_id))


@router.delete("/history/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def clear_chat_history(
    session_id: uuid.UUID,
    chat_service: ChatServiceDep,
):
    """Clear the conversation history for a given session."""
    await chat_service.delete_history(str(session_id))
    return None
