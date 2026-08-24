import json
import sys
import uuid
from pathlib import Path
from unittest.mock import MagicMock

if "langchain_community.chat_models.vertexai" not in sys.modules:
    sys.modules["langchain_community.chat_models.vertexai"] = MagicMock()

import math

from datasets import Dataset
from langchain_core.messages import BaseMessage
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from pydantic import SecretStr
from ragas import evaluate
from ragas.metrics import (
    answer_relevancy,
    context_precision,
    context_recall,
    faithfulness,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.ingestion.embedder import Embedder
from app.rag.chat import generate_chat_response
from app.rag.retriever import UFCRetriever
from app.schemas.eval import EvalMetricResult, EvalQuestionResult, EvalRunResult


async def run_evaluation(
    session: AsyncSession, embedder: Embedder,
) -> EvalRunResult:
    """Run Ragas evaluation on the golden_dataset.json."""
    dataset_path = Path(__file__).parent.parent.parent / "data" / "eval" / "golden_dataset.json"
    if not dataset_path.exists():
        raise FileNotFoundError(f"Evaluation dataset not found at {dataset_path}")

    with open(dataset_path, encoding="utf-8") as f:
        eval_data = json.load(f)

    questions = []
    ground_truths = []
    answers = []
    contexts_list = []

    retriever = UFCRetriever(session=session, embedder=embedder, k=4)

    for item in eval_data:
        question = item["question"]
        questions.append(question)
        ground_truths.append(item["ground_truth"])

        chat_history: list[BaseMessage] = []
        response_data = await generate_chat_response(
            message=question,
            history=chat_history,
            session=session,
            embedder=embedder,
        )
        answers.append(response_data["answer"])

        docs = await retriever.ainvoke(question)
        contexts = [doc.page_content for doc in docs]
        contexts_list.append(contexts)

    data_dict = {
        "question": questions,
        "answer": answers,
        "contexts": contexts_list,
        "ground_truth": ground_truths,
    }

    dataset = Dataset.from_dict(data_dict)

    llm = ChatGoogleGenerativeAI(
        model=settings.llm_model,
        google_api_key=SecretStr(settings.google_api_key),
    )
    eval_embedder = GoogleGenerativeAIEmbeddings(
        model=settings.embedding_model,
        google_api_key=SecretStr(settings.google_api_key),
    )

    result = evaluate(
        dataset,
        metrics=[
            faithfulness,
            answer_relevancy,
            context_precision,
            context_recall,
        ],
        llm=llm,
        embeddings=eval_embedder,
    )
    df = result.to_pandas()  # type: ignore[union-attr]
    question_results = []

    for i in range(len(df)):
        metrics = []
        for metric_name in ["faithfulness", "answer_relevancy", "context_precision", "context_recall"]:
            score = float(df.iloc[i].get(metric_name, 0.0))
            if math.isnan(score):
                score = 0.0

            metrics.append(
                EvalMetricResult(
                    name=metric_name,
                    score=score,
                    reasoning=None,
                ),
            )

        q_result = EvalQuestionResult(
            question=df.iloc[i]["question"],
            ground_truth=df.iloc[i]["ground_truth"],
            generated_answer=df.iloc[i]["answer"],
            contexts=df.iloc[i]["contexts"],
            metrics=metrics,
        )
        question_results.append(q_result)

    overall_scores = {
        k: (0.0 if __import__("math").isnan(v) else float(v))
        for k, v in result.items()  # type: ignore[union-attr]
    }

    return EvalRunResult(
        run_id=str(uuid.uuid4()),
        dataset_name="eval_dataset.json",
        overall_scores=overall_scores,
        question_results=question_results,
    )
