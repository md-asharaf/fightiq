
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ResourceNotFoundError
from app.db.models import QuizResult, QuizSession
from app.schemas.quiz import QuestionResult, QuizSubmitRequest, QuizSubmitResponse


async def evaluate_quiz(
    session: AsyncSession,
    submit_request: QuizSubmitRequest,
) -> QuizSubmitResponse:
    """Evaluate a user's quiz submission against the stored quiz session."""
    stmt = select(QuizSession).where(QuizSession.id == submit_request.session_id)
    result = await session.execute(stmt)
    quiz_session = result.scalar_one_or_none()

    if not quiz_session:
        raise ResourceNotFoundError(f"Quiz session {submit_request.session_id} not found.")

    questions = quiz_session.questions
    score = 0
    question_results = []

    for q_data in questions:
        q_id = q_data["id"]
        correct_id = q_data["correct_option_id"]
        explanation = q_data["explanation"]

        selected_id = submit_request.answers.get(q_id)
        is_correct = (selected_id == correct_id)

        if is_correct:
            score += 1

        question_results.append(
            QuestionResult(
                question_id=q_id,
                is_correct=is_correct,
                selected_option_id=selected_id,
                correct_option_id=correct_id,
                explanation=explanation,
            ),
        )

    total = len(questions)
    percentage = (score / total * 100) if total > 0 else 0.0

    quiz_result_db = QuizResult(
        session_id=quiz_session.id,
        answers=submit_request.answers,
        score=score,
        total_questions=total,
        score_percentage=percentage,
    )
    session.add(quiz_result_db)

    return QuizSubmitResponse(
        session_id=quiz_session.id,
        score=score,
        total_questions=total,
        score_percentage=percentage,
        results=question_results,
    )
