from langchain_core.language_models import BaseChatModel

from app.core.exceptions import ResourceNotFoundError
from app.core.interfaces import IQuizRepository
from app.schemas.quiz import (
    QuizGenerateRequest,
    QuizSubmitRequest,
    QuizSubmitResponse,
)
from app.utils.embedder import Embedder
from app.utils.quiz_evaluator import evaluate_quiz
from app.utils.quiz_generator import generate_quiz


class QuizService:
    def __init__(self, quiz_repository: IQuizRepository, chunk_repository, embedder: Embedder, llm: BaseChatModel):
        self.repo = quiz_repository
        self.chunk_repo = chunk_repository
        self.embedder = embedder
        self.llm = llm

    async def generate_quiz(self, request: QuizGenerateRequest, user_id: str | None = None):
        query_embedding = await self.embedder.aembed_query(request.topic)
        chunks_with_scores = await self.chunk_repo.similarity_search_with_scores(
            query_embedding=query_embedding,
            k=10,
            category=request.category,
            fighter=request.fighter,
        )

        context_str = "\n\n".join(
            f"Document Title: {c['metadata'].get('title', 'Unknown')}\n{c['content']}"
            for c in chunks_with_scores
        )

        generated_data = await generate_quiz(
            llm=self.llm,
            topic=request.topic,
            difficulty=request.difficulty,
            num_questions=request.num_questions,
            context_str=context_str,
        )

        quiz_session = await self.repo.create_session(
            topic=generated_data.topic,
            category=request.category,
            difficulty=generated_data.difficulty,
            questions=[q.model_dump() for q in generated_data.questions],
            user_id=user_id,
        )
        await self.repo.commit()
        return quiz_session

    async def evaluate_quiz(self, request: QuizSubmitRequest, user_id: str | None = None):
        quiz_session = await self.get_session(request.session_id, user_id=user_id)

        quiz_result_db, response = evaluate_quiz(quiz_session, request)

        await self.repo.save_result(quiz_result_db)
        await self.repo.commit()
        return response

    async def get_sessions(self, skip: int = 0, limit: int = 20, user_id: str | None = None):
        return await self.repo.get_sessions(skip=skip, limit=limit, user_id=user_id)

    async def get_session(self, session_id, user_id: str | None = None):
        session = await self.repo.get_session(session_id)
        if not session:
            raise ResourceNotFoundError(f"Quiz session '{session_id}' not found")
        if session.user_id and session.user_id != user_id:
            raise ResourceNotFoundError(f"Quiz session '{session_id}' not found")
        return session

    async def get_result(self, session_id):
        result = await self.repo.get_result(session_id)
        if not result:
            raise ResourceNotFoundError(f"Quiz result for session '{session_id}' not found")
        return result

    async def get_detailed_result(self, session_id, user_id: str | None = None) -> QuizSubmitResponse:
        from app.utils.quiz_evaluator import build_quiz_submit_response
        session = await self.get_session(session_id, user_id=user_id)
        result_db = await self.get_result(session_id)

        _, response = build_quiz_submit_response(session, result_db.answers)
        return response
