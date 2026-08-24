from sqlalchemy.ext.asyncio import AsyncSession

from app.ingestion.embedder import Embedder
from app.quiz.evaluator import evaluate_quiz
from app.quiz.generator import generate_quiz
from app.repositories.quiz_repository import QuizRepository
from app.schemas.quiz import QuizGenerateRequest, QuizSubmitRequest


class QuizService:
    def __init__(self, quiz_repository: QuizRepository, db: AsyncSession, embedder: Embedder):
        self.repo = quiz_repository
        self.db = db
        self.embedder = embedder

    async def generate_quiz(self, request: QuizGenerateRequest):
        generated_data = await generate_quiz(
            session=self.db,
            embedder=self.embedder,
            topic=request.topic,
            difficulty=request.difficulty,
            num_questions=request.num_questions,
            category=request.category,
            fighter=request.fighter,
        )

        return await self.repo.create_session(
            topic=generated_data.topic,
            category=request.category,
            difficulty=generated_data.difficulty,
            questions=[q.model_dump() for q in generated_data.questions],
        )

    async def evaluate_quiz(self, request: QuizSubmitRequest):
        # NOTE: evaluate_quiz directly uses db right now,
        # it could be refactored to use QuizRepository in the future
        return await evaluate_quiz(self.db, request)

    async def get_sessions(self, skip: int = 0, limit: int = 20):
        return await self.repo.get_sessions(skip=skip, limit=limit)
