import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

from app.core.dependencies import get_chat_service
from app.schemas.chat import ChatHistory, ChatRequest, ChatResponse
from app.services.chat_service import ChatService

router = APIRouter()

@router.post("/message")
async def chat_message(
    request: ChatRequest,
    chat_service: ChatService = Depends(get_chat_service),
):
    """Send a message to the RAG chat system.
    Supports both streaming (SSE) and non-streaming responses.
    """
    session_id_str = request.session_id or str(uuid.uuid4())

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
    session_id: str,
    chat_service: ChatService = Depends(get_chat_service)
):
    """Retrieve the conversation history for a given session."""
    try:
        # validate uuid format before calling service
        uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid session_id format")

    history = await chat_service.get_history(session_id)
    if not history:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )
    return history


@router.delete("/history/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def clear_chat_history(
    session_id: str,
    chat_service: ChatService = Depends(get_chat_service)
):
    """Clear the conversation history for a given session."""
    try:
        uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid session_id format")

    await chat_service.delete_history(session_id)
    return None
