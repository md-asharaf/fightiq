import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db
from app.ingestion.embedder import Embedder
from app.rag.chat import generate_chat_response, stream_chat_response
from app.schemas.chat import ChatHistory, ChatMessage, ChatRequest, ChatResponse

router = APIRouter()

# In-memory storage for chat histories (Phase 2).
# In a production app, this would be backed by Redis or PostgreSQL.
_chat_sessions: dict[str, list[BaseMessage]] = {}
_chat_history_metadata: dict[str, list[ChatMessage]] = {}


@router.post("/message")
async def chat_message(
    request: ChatRequest,
    session: AsyncSession = Depends(get_db),
    embedder: Embedder = Depends(),
):
    """
    Send a message to the RAG chat system.
    Supports both streaming (SSE) and non-streaming responses.
    """
    # 1. Manage session
    session_id = request.session_id or str(uuid.uuid4())
    if session_id not in _chat_sessions:
        _chat_sessions[session_id] = []
        _chat_history_metadata[session_id] = []

    history = _chat_sessions[session_id]

    # Save user message to metadata for history retrieval
    _chat_history_metadata[session_id].append(
        ChatMessage(role="user", content=request.message)
    )

    if request.stream:
        # We need a wrapper to save the AI message to history after streaming completes
        async def stream_and_save():
            full_response = ""
            sources = []
            import json
            async for chunk_str in stream_chat_response(
                request.message, history, session, embedder, request.filters
            ):
                yield chunk_str
                try:
                    data = json.loads(chunk_str)
                    if data["type"] == "chunk":
                        full_response += data["data"]
                    elif data["type"] == "sources":
                        sources = data["data"]
                except Exception:
                    pass

            # Save to LangChain history
            _chat_sessions[session_id].append(HumanMessage(content=request.message))
            _chat_sessions[session_id].append(AIMessage(content=full_response))

            # Save to our metadata history
            _chat_history_metadata[session_id].append(
                ChatMessage(role="assistant", content=full_response, sources=sources)
            )

        return StreamingResponse(stream_and_save(), media_type="text/event-stream")
    else:
        # Non-streaming
        response_data = await generate_chat_response(
            request.message, history, session, embedder, request.filters
        )

        # Save to LangChain history
        _chat_sessions[session_id].append(HumanMessage(content=request.message))
        _chat_sessions[session_id].append(AIMessage(content=response_data["answer"]))

        # Save to metadata history
        msg = ChatMessage(
            role="assistant",
            content=response_data["answer"],
            sources=response_data["sources"]
        )
        _chat_history_metadata[session_id].append(msg)

        return ChatResponse(session_id=session_id, message=msg)


@router.get("/history/{session_id}", response_model=ChatHistory)
async def get_chat_history(session_id: str):
    """Retrieve the conversation history for a given session."""
    if session_id not in _chat_history_metadata:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    return ChatHistory(
        session_id=session_id,
        messages=_chat_history_metadata[session_id]
    )


@router.delete("/history/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def clear_chat_history(session_id: str):
    """Clear the conversation history for a given session."""
    if session_id in _chat_sessions:
        del _chat_sessions[session_id]
        del _chat_history_metadata[session_id]
