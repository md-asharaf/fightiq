import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import ChatMessage, ChatSession


class ChatRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_session(self, session_id: uuid.UUID) -> ChatSession | None:
        stmt = select(ChatSession).where(ChatSession.id == session_id).options(selectinload(ChatSession.messages))
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def create_session(self, session_id: uuid.UUID) -> ChatSession:
        chat_session = ChatSession(id=session_id)
        self.session.add(chat_session)
        await self.session.commit()
        await self.session.refresh(chat_session)
        return chat_session

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
            await self.session.delete(chat_session)
            await self.session.commit()
            return True
        return False
