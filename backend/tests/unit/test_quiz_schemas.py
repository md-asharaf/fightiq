import pytest
from pydantic import ValidationError

from app.schemas.quiz import Question, QuestionOption


def test_question_valid():
    """Test that a valid Question passes validation."""
    options = [
        QuestionOption(id="A", text="Option A"),
        QuestionOption(id="B", text="Option B"),
        QuestionOption(id="C", text="Option C"),
        QuestionOption(id="D", text="Option D"),
    ]
    q = Question(
        id="q1",
        text="What is the answer?",
        options=options,
        correct_option_id="C",
        explanation="Because C is correct.",
        sources=["Doc 1"]
    )
    assert q.correct_option_id == "C"


def test_question_invalid_option_count():
    """Test that exactly 4 options are required."""
    options = [
        QuestionOption(id="A", text="Option A"),
        QuestionOption(id="B", text="Option B"),
    ]
    with pytest.raises(ValidationError, match="Exactly 4 options are required"):
        Question(
            id="q1",
            text="What is the answer?",
            options=options,
            correct_option_id="A",
            explanation="Because A.",
        )


def test_question_invalid_correct_option():
    """Test that correct_option_id must match one of the option ids."""
    options = [
        QuestionOption(id="A", text="Option A"),
        QuestionOption(id="B", text="Option B"),
        QuestionOption(id="C", text="Option C"),
        QuestionOption(id="D", text="Option D"),
    ]
    with pytest.raises(ValidationError, match="is not one of the option IDs"):
        Question(
            id="q1",
            text="What is the answer?",
            options=options,
            correct_option_id="E",  # Invalid!
            explanation="Because E.",
        )
