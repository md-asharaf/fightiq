import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.core.dependencies import get_quiz_service
from app.schemas.quiz import (
    QuizGenerateRequest,
    QuizSessionRead,
    QuizSubmitRequest,
    QuizSubmitResponse,
    QuestionResult
)
from app.services.quiz_service import QuizService

router = APIRouter()

QuizServiceDep = Annotated[QuizService, Depends(get_quiz_service)]

@router.post("/generate", response_model=QuizSessionRead, status_code=status.HTTP_201_CREATED)
async def api_generate_quiz(
    request: QuizGenerateRequest,
    quiz_service: QuizServiceDep,
):
    """Generate a new quiz based on a topic and save the session to the DB."""
    return await quiz_service.generate_quiz(request)


@router.post("/submit", response_model=QuizSubmitResponse)
async def api_submit_quiz(
    request: QuizSubmitRequest,
    quiz_service: QuizServiceDep,
):
    """Submit answers for a quiz session and get the graded results."""
    return await quiz_service.evaluate_quiz(request)


@router.get("/sessions", response_model=list[QuizSessionRead])
async def api_list_quiz_sessions(
    quiz_service: QuizServiceDep,
    skip: int = 0,
    limit: int = 20,
):
    """List past quiz sessions (without answers)."""
    return await quiz_service.get_sessions(skip=skip, limit=limit)


@router.get("/sessions/{session_id}", response_model=QuizSessionRead)
async def api_get_quiz_session(
    session_id: uuid.UUID,
    quiz_service: QuizServiceDep,
):
    """Get a specific quiz session (without answers)."""
    return await quiz_service.get_session(session_id)


@router.get("/results/{session_id}", response_model=QuizSubmitResponse)
async def api_get_quiz_result(
    session_id: uuid.UUID,
    quiz_service: QuizServiceDep,
):
    """Get the result of a submitted quiz session."""
    session = await quiz_service.get_session(session_id)
    result_db = await quiz_service.get_result(session_id)

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
