import json
import uuid
from collections.abc import AsyncGenerator

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.ingestion.embedder import Embedder
from app.rag.chat import generate_chat_response, stream_chat_response
from app.repositories.chat_repository import ChatRepository
from app.schemas.chat import ChatHistory, ChatMessage

log = get_logger(__name__)

class ChatService:
    def __init__(self, chat_repository: ChatRepository, db: AsyncSession, embedder: Embedder):
        self.repo = chat_repository
        self.db = db
        self.embedder = embedder

    async def get_or_create_session(self, session_id_str: str):
        session_uuid = uuid.UUID(session_id_str)
        chat_session = await self.repo.get_session(session_uuid)
        if not chat_session:
            chat_session = await self.repo.create_session(session_uuid)
        return chat_session

    async def process_message(self, session_id_str: str, message: str, stream: bool, filters: dict | None = None):
        chat_session = await self.get_or_create_session(session_id_str)

        history: list[BaseMessage] = []
        if hasattr(chat_session, "messages"):
            for m in chat_session.messages:
                if m.role == "user":
                    history.append(HumanMessage(content=m.content))
                elif m.role == "assistant":
                    history.append(AIMessage(content=m.content))

        await self.repo.add_message(chat_session.id, "user", message)

        if stream:
            return self._stream_response(chat_session.id, message, history, filters)

        response_data = await generate_chat_response(
            message, history, self.db, self.embedder, filters,
        )

        await self.repo.add_message(
            chat_session.id, "assistant", response_data["answer"], response_data["sources"]
        )

        return ChatMessage(
            role="assistant",
            content=response_data["answer"],
            sources=response_data["sources"],
        )

    async def _stream_response(self, session_id: uuid.UUID, message: str, history: list[BaseMessage], filters: dict | None) -> AsyncGenerator[str, None]:
        full_response = ""
        sources = []
        async for chunk_str in stream_chat_response(
            message, history, self.db, self.embedder, filters,
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

        await self.repo.add_message(session_id, "assistant", full_response, sources)

    async def get_history(self, session_id_str: str) -> ChatHistory | None:
        session_uuid = uuid.UUID(session_id_str)
        chat_session = await self.repo.get_session(session_uuid)
        if not chat_session:
            return None

        sorted_messages = sorted(chat_session.messages, key=lambda x: x.created_at)
        messages = [
            ChatMessage(role=m.role, content=m.content, sources=m.sources)
            for m in sorted_messages
        ]
        return ChatHistory(session_id=session_id_str, messages=messages)

    async def delete_history(self, session_id_str: str) -> bool:
        session_uuid = uuid.UUID(session_id_str)
        return await self.repo.delete_session(session_uuid)
