import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import StreamingResponse

from app.core.dependencies import get_chat_service, get_current_user
from app.core.rate_limit import limiter
from app.db.auth_models import User
from app.schemas.chat import ChatHistory, ChatRequest, ChatResponse, ChatSessionPreview
from app.services.chat_service import ChatService

router = APIRouter()

ChatServiceDep = Annotated[ChatService, Depends(get_chat_service)]
CurrentUserDep = Annotated[User | None, Depends(get_current_user)]


@router.post("/message")
@limiter.limit("20/minute")
async def chat_message(
    request: Request,
    payload: ChatRequest,
    chat_service: ChatServiceDep,
    current_user: CurrentUserDep,
):
    """Send a message to the RAG chat system.
    Supports both streaming (SSE) and non-streaming responses.
    """
    user_id = current_user.id if current_user else None

    response = await chat_service.process_message(
        session_id_str=payload.session_id,
        message=payload.message,
        stream=payload.stream,
        user_id=user_id,
        filters=payload.filters,
    )

    if payload.stream:
        return StreamingResponse(
            response,
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache, no-transform",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )

    return ChatResponse(session_id=payload.session_id, message=response)


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
    current_user: CurrentUserDep,
):
    """Retrieve the conversation history for a given session."""
    user_id = current_user.id if current_user else None
    return await chat_service.get_history(str(session_id), user_id=user_id)


@router.delete("/history/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def clear_chat_history(
    session_id: uuid.UUID,
    chat_service: ChatServiceDep,
    current_user: CurrentUserDep,
):
    """Clear the conversation history for a given session."""
    user_id = current_user.id if current_user else None
    await chat_service.delete_history(str(session_id), user_id=user_id)
    return None


@router.post("/history/{session_id}/share")
async def share_chat_session(
    session_id: uuid.UUID,
    chat_service: ChatServiceDep,
    current_user: CurrentUserDep,
):
    """Make a chat session public and return the shareable link ID."""
    import secrets

    from fastapi import HTTPException

    if not current_user:
        raise HTTPException(status_code=401, detail="Must be logged in to share a chat.")

    # Get the session to verify ownership
    session = await chat_service.repo.get_session(session_id)
    if not session or (session.user_id and session.user_id != current_user.id):
        raise HTTPException(status_code=404, detail="Session not found or not owned by user.")

    if not getattr(session, "is_public", False):
        share_id = secrets.token_urlsafe(8)
        setattr(session, "is_public", True)
        setattr(session, "share_id", share_id)

        chat_service.db.add(session)
        await chat_service.db.commit()
    else:
        share_id = getattr(session, "share_id")

    return {"share_id": share_id, "url": f"/share/c/{share_id}"}
