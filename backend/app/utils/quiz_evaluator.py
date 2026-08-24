from app.db.models import QuizResult, QuizSession
from app.schemas.quiz import QuestionResult, QuizSubmitRequest, QuizSubmitResponse

def evaluate_quiz(
    quiz_session: QuizSession,
    submit_request: QuizSubmitRequest,
) -> tuple[QuizResult, QuizSubmitResponse]:
    """Evaluate a user's quiz submission against the stored quiz session."""
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

    response = QuizSubmitResponse(
        session_id=quiz_session.id,
        score=score,
        total_questions=total,
        score_percentage=percentage,
        results=question_results,
    )

    return quiz_result_db, response
