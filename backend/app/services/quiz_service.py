from langchain_core.language_models import BaseChatModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ResourceNotFoundError
from app.core.interfaces import IQuizRepository
from app.schemas.quiz import (
    QuestionResult,
    QuizGenerateRequest,
    QuizSubmitRequest,
    QuizSubmitResponse,
)
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

    async def get_detailed_result(self, session_id) -> QuizSubmitResponse:
        session = await self.get_session(session_id)
        result_db = await self.get_result(session_id)

        questions = session.questions
        question_results = []

        for q_data in questions:
            q_id = q_data["id"]
            correct_id = q_data["correct_option_id"]
            explanation = q_data["explanation"]

            selected_id = result_db.answers.get(q_id)
            is_correct = (selected_id == correct_id)

            question_results.append(
                QuestionResult(
                    question_id=q_id,
                    is_correct=is_correct,
                    selected_option_id=selected_id,
                    correct_option_id=correct_id,
                    explanation=explanation,
                )
            )

        return QuizSubmitResponse(
            session_id=session.id,
            score=result_db.score,
            total_questions=result_db.total_questions,
            score_percentage=result_db.score_percentage,
            results=question_results,
        )
