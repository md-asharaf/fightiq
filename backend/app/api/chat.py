import json
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.dependencies import get_db
from app.core.logging import get_logger
from app.db.models import ChatMessage as DBChatMessage
from app.db.models import ChatSession
from app.ingestion.embedder import Embedder
from app.rag.chat import generate_chat_response, stream_chat_response
from app.schemas.chat import ChatHistory, ChatMessage, ChatRequest, ChatResponse

log = get_logger(__name__)

router = APIRouter()


async def get_or_create_session(session_id_str: str, db: AsyncSession) -> ChatSession:
    try:
        session_uuid = uuid.UUID(session_id_str)
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid session_id format")

    stmt = select(ChatSession).where(ChatSession.id == session_uuid).options(selectinload(ChatSession.messages))
    result = await db.execute(stmt)
    chat_session = result.scalar_one_or_none()

    if not chat_session:
        chat_session = ChatSession(id=session_uuid)
        db.add(chat_session)
        await db.commit()
        await db.refresh(chat_session)

    return chat_session


@router.post("/message")
async def chat_message(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
    embedder: Embedder = Depends(),
):
    """Send a message to the RAG chat system.
    Supports both streaming (SSE) and non-streaming responses.
    """
    session_id_str = request.session_id or str(uuid.uuid4())
    chat_session = await get_or_create_session(session_id_str, db)

    history: list[BaseMessage] = []

    if "messages" in chat_session.__dict__:
        for m in chat_session.messages:
            if m.role == "user":
                history.append(HumanMessage(content=m.content))
            elif m.role == "assistant":
                history.append(AIMessage(content=m.content))

    user_db_msg = DBChatMessage(
        session_id=chat_session.id,
        role="user",
        content=request.message,
    )
    db.add(user_db_msg)
    await db.commit()

    if request.stream:
        async def stream_and_save():
            full_response = ""
            sources = []
            async for chunk_str in stream_chat_response(
                request.message, history, db, embedder, request.filters,
            ):
                yield chunk_str
                try:
                    data = json.loads(chunk_str)
                    if data["type"] == "chunk":
                        full_response += data["data"]
                    elif data["type"] == "sources":
                        sources = data["data"]
                except Exception as e:
                    log.error("Failed to parse stream data", error=str(e), exc_info=True)

            ai_db_msg = DBChatMessage(
                session_id=chat_session.id,
                role="assistant",
                content=full_response,
                sources=sources,
            )
            db.add(ai_db_msg)
            await db.commit()

        return StreamingResponse(stream_and_save(), media_type="text/event-stream")

    response_data = await generate_chat_response(
        request.message, history, db, embedder, request.filters,
    )

    ai_db_msg = DBChatMessage(
        session_id=chat_session.id,
        role="assistant",
        content=response_data["answer"],
        sources=response_data["sources"],
    )
    db.add(ai_db_msg)
    await db.commit()

    msg = ChatMessage(
        role="assistant",
        content=response_data["answer"],
        sources=response_data["sources"],
    )

    return ChatResponse(session_id=session_id_str, message=msg)


@router.get("/history/{session_id}", response_model=ChatHistory)
async def get_chat_history(session_id: str, db: AsyncSession = Depends(get_db)):
    """Retrieve the conversation history for a given session."""
    try:
        session_uuid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid session_id format")

    stmt = select(ChatSession).where(ChatSession.id == session_uuid).options(selectinload(ChatSession.messages))
    result = await db.execute(stmt)
    chat_session = result.scalar_one_or_none()

    if not chat_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    messages = []
    # Sort messages by created_at just in case
    sorted_messages = sorted(chat_session.messages, key=lambda x: x.created_at)
    for m in sorted_messages:
        messages.append(ChatMessage(role=m.role, content=m.content, sources=m.sources))

    return ChatHistory(
        session_id=session_id,
        messages=messages,
    )


@router.delete("/history/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def clear_chat_history(session_id: str, db: AsyncSession = Depends(get_db)):
    """Clear the conversation history for a given session."""
    try:
        session_uuid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid session_id format")

    stmt = select(ChatSession).where(ChatSession.id == session_uuid)
    result = await db.execute(stmt)
    chat_session = result.scalar_one_or_none()

    if chat_session:
        await db.delete(chat_session)
        await db.commit()
