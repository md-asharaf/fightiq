import uuid
from collections.abc import Sequence

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import QuizResult, QuizSession
from app.repositories.base_repository import BaseRepository


class QuizRepository(BaseRepository[QuizSession]):
    def __init__(self, session: AsyncSession):
        super().__init__(QuizSession, session)

    async def create_session(
        self,
        topic: str,
        category: str | None,
        difficulty: str,
        questions: list,
        user_id: str | None = None,
    ) -> QuizSession:
        quiz_session = QuizSession(
            user_id=user_id,
            topic=topic,
            category=category,
            difficulty=difficulty,
            num_questions=len(questions),
            questions=questions,
        )
        return self.add(quiz_session)

    async def get_session(self, session_id: uuid.UUID) -> QuizSession | None:
        stmt = (
            select(QuizSession)
            .options(selectinload(QuizSession.results))
            .where(QuizSession.id == session_id)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_sessions(
        self, skip: int = 0, limit: int = 20, user_id: str | None = None
    ) -> Sequence[QuizSession]:
        stmt = (
            select(QuizSession)
            .options(selectinload(QuizSession.results))
            .order_by(desc(QuizSession.created_at))
        )
        if user_id:
            stmt = stmt.where(QuizSession.user_id == user_id)
        stmt = stmt.offset(skip).limit(limit)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def update_session(self, quiz_session: QuizSession) -> QuizSession:
        return self.add(quiz_session)

    async def get_result(self, session_id: uuid.UUID) -> QuizResult | None:
        stmt = (
            select(QuizResult)
            .where(QuizResult.session_id == session_id)
            .order_by(desc(QuizResult.created_at))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def save_result(self, quiz_result: QuizResult) -> QuizResult:
        self.session.add(quiz_result)
        return quiz_result
