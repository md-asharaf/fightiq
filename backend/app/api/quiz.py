from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import get_quiz_service
from app.schemas.quiz import (
    QuizGenerateRequest,
    QuizSessionRead,
    QuizSubmitRequest,
    QuizSubmitResponse,
)
from app.services.quiz_service import QuizService

router = APIRouter()

@router.post("/generate", response_model=QuizSessionRead, status_code=status.HTTP_201_CREATED)
async def api_generate_quiz(
    request: QuizGenerateRequest,
    quiz_service: QuizService = Depends(get_quiz_service),
):
    """Generate a new quiz based on a topic and save the session to the DB."""
    try:
        quiz_session = await quiz_service.generate_quiz(request)
        return quiz_session
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate quiz: {e!s}",
        )


@router.post("/submit", response_model=QuizSubmitResponse)
async def api_submit_quiz(
    request: QuizSubmitRequest,
    quiz_service: QuizService = Depends(get_quiz_service),
):
    """Submit answers for a quiz session and get the graded results."""
    try:
        response = await quiz_service.evaluate_quiz(request)
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
    quiz_service: QuizService = Depends(get_quiz_service),
):
    """List past quiz sessions (without answers)."""
    return await quiz_service.get_sessions(skip=skip, limit=limit)
