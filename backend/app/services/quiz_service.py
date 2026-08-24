from langchain_core.language_models import BaseChatModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.interfaces import IQuizRepository
from app.core.exceptions import ResourceNotFoundError
from app.schemas.quiz import QuizGenerateRequest, QuizSubmitRequest
from app.utils.embedder import Embedder
from app.utils.quiz_evaluator import evaluate_quiz
from app.utils.quiz_generator import generate_quiz


class QuizService:
    def __init__(self, quiz_repository: IQuizRepository, db: AsyncSession, embedder: Embedder, llm: BaseChatModel):
        self.repo = quiz_repository
        self.db = db
        self.embedder = embedder
        self.llm = llm

    async def generate_quiz(self, request: QuizGenerateRequest):
        generated_data = await generate_quiz(
            session=self.db,
            embedder=self.embedder,
            llm=self.llm,
            topic=request.topic,
            difficulty=request.difficulty,
            num_questions=request.num_questions,
            category=request.category,
            fighter=request.fighter,
        )

        quiz_session = await self.repo.create_session(
            topic=generated_data.topic,
            category=request.category,
            difficulty=generated_data.difficulty,
            questions=[q.model_dump() for q in generated_data.questions],
        )
        await self.db.commit()
        return quiz_session

    async def evaluate_quiz(self, request: QuizSubmitRequest):
        res = await evaluate_quiz(self.db, request)
        await self.db.commit()
        return res

    async def get_sessions(self, skip: int = 0, limit: int = 20):
        return await self.repo.get_sessions(skip=skip, limit=limit)

    async def get_session(self, session_id):
        session = await self.repo.get_session(session_id)
        if not session:
            raise ResourceNotFoundError(f"Quiz session '{session_id}' not found")
        return session

    async def get_result(self, session_id):
        result = await self.repo.get_result(session_id)
        if not result:
            raise ResourceNotFoundError(f"Quiz result for session '{session_id}' not found")
        return result
