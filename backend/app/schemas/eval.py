from datetime import UTC, datetime

from pydantic import BaseModel, Field


class EvalMetricResult(BaseModel):
    """Result for a single evaluation metric."""

    name: str = Field(description="Name of the metric (e.g. 'faithfulness', 'answer_relevancy')")
    score: float = Field(description="Score between 0.0 and 1.0")
    reasoning: str | None = Field(default=None, description="Optional reasoning for the score")


class EvalQuestionResult(BaseModel):
    """Evaluation result for a single question in the dataset."""

    question: str
    ground_truth: str
    generated_answer: str
    contexts: list[str]
    metrics: list[EvalMetricResult]


class EvalRunResult(BaseModel):
    """Overall evaluation run results."""

    run_id: str
    dataset_name: str
    overall_scores: dict[str, float] = Field(
        description="Average score for each metric across all questions"
    )
    question_results: list[EvalQuestionResult]
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC).replace(tzinfo=None))
