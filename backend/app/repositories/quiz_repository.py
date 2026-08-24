import uuid
from collections.abc import Sequence

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import QuizResult, QuizSession
from app.repositories.base_repository import BaseRepository


class QuizRepository(BaseRepository[QuizSession]):
    def __init__(self, session: AsyncSession):
        super().__init__(QuizSession, session)

    async def create_session(self, topic: str, category: str | None, difficulty: str, questions: list) -> QuizSession:
        quiz_session = QuizSession(
            topic=topic,
            category=category,
            difficulty=difficulty,
            num_questions=len(questions),
            questions=questions,
        )
        return self.add(quiz_session)

    async def get_session(self, session_id: uuid.UUID) -> QuizSession | None:
        return await self.get_by_id(session_id)

    async def get_sessions(self, skip: int = 0, limit: int = 20) -> Sequence[QuizSession]:
        stmt = select(QuizSession).order_by(desc(QuizSession.created_at)).offset(skip).limit(limit)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def update_session(self, quiz_session: QuizSession) -> QuizSession:
        return self.add(quiz_session)

    async def get_result(self, session_id: uuid.UUID) -> QuizResult | None:
        stmt = select(QuizResult).where(QuizResult.session_id == session_id).order_by(desc(QuizResult.created_at))
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
