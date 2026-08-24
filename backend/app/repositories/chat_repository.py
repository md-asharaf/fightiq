import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import ChatMessage, ChatSession
from app.repositories.base_repository import BaseRepository


class ChatRepository(BaseRepository[ChatSession]):
    def __init__(self, session: AsyncSession):
        super().__init__(ChatSession, session)

    async def get_session(self, session_id: uuid.UUID) -> ChatSession | None:
        stmt = (
            select(ChatSession)
            .where(ChatSession.id == session_id)
            .options(selectinload(ChatSession.messages))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def create_session(
        self, session_id: uuid.UUID, user_id: str | None = None
    ) -> ChatSession:
        chat_session = ChatSession(id=session_id, user_id=user_id)
        self.session.add(chat_session)
        await self.session.commit()
        return chat_session

    async def list_sessions(self, user_id: str | None = None, limit: int = 50) -> list[ChatSession]:
        stmt = select(ChatSession).order_by(ChatSession.created_at.desc()).limit(limit)
        if user_id:
            stmt = stmt.where(ChatSession.user_id == user_id)
        else:
            stmt = stmt.where(ChatSession.user_id.is_(None))
        stmt = stmt.options(selectinload(ChatSession.messages))
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def add_message(
        self, session_id: uuid.UUID, role: str, content: str, sources: list | None = None
    ) -> ChatMessage:
        msg = ChatMessage(session_id=session_id, role=role, content=content, sources=sources)
        self.session.add(msg)
        await self.session.commit()
        return msg

    async def delete_session(self, session_id: uuid.UUID) -> bool:
        chat_session = await self.get_session(session_id)
        if chat_session:
            await self.delete(chat_session)
            await self.session.commit()
            return True
        return False
