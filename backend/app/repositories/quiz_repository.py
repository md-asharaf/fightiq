import uuid

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import QuizSession


class QuizRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_session(self, topic: str, category: str | None, difficulty: str, questions: list) -> QuizSession:
        quiz_session = QuizSession(
            topic=topic,
            category=category,
            difficulty=difficulty,
            num_questions=len(questions),
            questions=questions,
        )
        self.session.add(quiz_session)
        await self.session.commit()
        await self.session.refresh(quiz_session)
        return quiz_session

    async def get_session(self, session_id: uuid.UUID) -> QuizSession | None:
        stmt = select(QuizSession).where(QuizSession.id == session_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_sessions(self, skip: int = 0, limit: int = 20) -> list[QuizSession]:
        stmt = select(QuizSession).order_by(desc(QuizSession.created_at)).offset(skip).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def update_session(self, quiz_session: QuizSession) -> QuizSession:
        self.session.add(quiz_session)
        await self.session.commit()
        await self.session.refresh(quiz_session)
        return quiz_session
