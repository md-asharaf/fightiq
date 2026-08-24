
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, get_embedder
from app.db.models import QuizSession
from app.ingestion.embedder import Embedder
from app.quiz.evaluator import evaluate_quiz
from app.quiz.generator import generate_quiz
from app.schemas.quiz import (
    QuizGenerateRequest,
    QuizSessionRead,
    QuizSubmitRequest,
    QuizSubmitResponse,
)

router = APIRouter()


@router.post("/generate", response_model=QuizSessionRead, status_code=status.HTTP_201_CREATED)
async def api_generate_quiz(
    request: QuizGenerateRequest,
    session: AsyncSession = Depends(get_db),
    embedder: Embedder = Depends(get_embedder),
):
    """Generate a new quiz based on a topic and save the session to the DB.
    """
    try:
        generated_data = await generate_quiz(
            session=session,
            embedder=embedder,
            topic=request.topic,
            difficulty=request.difficulty,
            num_questions=request.num_questions,
            category=request.category,
            fighter=request.fighter,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate quiz: {e!s}",
        )

    quiz_session = QuizSession(
        topic=generated_data.topic,
        category=request.category,
        difficulty=generated_data.difficulty,
        num_questions=len(generated_data.questions),
        questions=[q.model_dump() for q in generated_data.questions],
    )
    session.add(quiz_session)
    await session.commit()
    await session.refresh(quiz_session)

    return quiz_session


@router.post("/submit", response_model=QuizSubmitResponse)
async def api_submit_quiz(
    request: QuizSubmitRequest,
    session: AsyncSession = Depends(get_db),
):
    """Submit answers for a quiz session and get the graded results."""
    try:
        response = await evaluate_quiz(session, request)
        return response
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to evaluate quiz: {e!s}",
        )


@router.get("/sessions", response_model=list[QuizSessionRead])
async def api_list_quiz_sessions(
    skip: int = 0,
    limit: int = 20,
    session: AsyncSession = Depends(get_db),
):
    """List past quiz sessions (without answers)."""
    stmt = select(QuizSession).order_by(desc(QuizSession.created_at)).offset(skip).limit(limit)
    result = await session.execute(stmt)
    sessions = result.scalars().all()
    return sessions
