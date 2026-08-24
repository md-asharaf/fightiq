import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status
from fastapi.responses import StreamingResponse

from app.core.dependencies import get_chat_service, get_current_user
from app.db.auth_models import User
from app.schemas.chat import ChatHistory, ChatRequest, ChatResponse, ChatSessionPreview
from app.services.chat_service import ChatService

router = APIRouter()

ChatServiceDep = Annotated[ChatService, Depends(get_chat_service)]
CurrentUserDep = Annotated[User | None, Depends(get_current_user)]

@router.post("/message")
async def chat_message(
    request: ChatRequest,
    chat_service: ChatServiceDep,
    current_user: CurrentUserDep,
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
    user_id = current_user.id if current_user else None

    response = await chat_service.process_message(
        session_id_str=session_id_str,
        message=request.message,
        stream=request.stream,
        user_id=user_id,
        filters=request.filters,
    )

    if request.stream:
        return StreamingResponse(response, media_type="text/event-stream")

    return ChatResponse(session_id=session_id_str, message=response)


@router.get("/sessions", response_model=list[ChatSessionPreview])
async def list_chat_sessions(
    chat_service: ChatServiceDep,
    current_user: CurrentUserDep,
):
    """Retrieve all chat sessions for the authenticated user.
    If unauthenticated, returns 401 Unauthorized to trigger frontend state.
    """
    from fastapi import HTTPException
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required to view chat history")
    return await chat_service.list_sessions(user_id=current_user.id)


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
