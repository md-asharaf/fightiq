import json
import uuid
from pathlib import Path

import sys
from unittest.mock import MagicMock

# Patch langchain_community.chat_models.vertexai before ragas imports it
# This bypasses an incompatibility between Ragas 0.4.x and LangChain 0.3.x
if "langchain_community.chat_models.vertexai" not in sys.modules:
    sys.modules["langchain_community.chat_models.vertexai"] = MagicMock()

from datasets import Dataset
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
from app.schemas.eval import EvalMetricResult, EvalQuestionResult, EvalRunResult


async def run_evaluation(
    session: AsyncSession, embedder: Embedder
) -> EvalRunResult:
    """Run Ragas evaluation on the eval_dataset.json."""

    # 1. Load eval dataset
    dataset_path = Path("data/eval/eval_dataset.json")
    if not dataset_path.exists():
        raise FileNotFoundError(f"Evaluation dataset not found at {dataset_path}")

    with open(dataset_path, encoding="utf-8") as f:
        eval_data = json.load(f)

    questions = []
    ground_truths = []

    for item in eval_data:
        questions.append(item["question"])
        ground_truths.append(item["ground_truth"])

    # 2. Generate answers and retrieve contexts for each question
    answers = []
    contexts_list = []

    from langchain_core.messages import BaseMessage
    for question in questions:
        # We use a fresh chat history for each question to evaluate single-turn RAG
        chat_history: list[BaseMessage] = []

        response_data = await generate_chat_response(
            message=question,
            history=chat_history,
            session=session,
            embedder=embedder,
        )

        answers.append(response_data["answer"])

        # Extract context texts
        # The sources contain text and title. We just need the text for ragas.
        # But our current implementation of `generate_chat_response` returns `sources`
        # as a list of dicts: {"source_id": "...", "title": "...", "text": "..."}
        # Wait, extract_citations returns {"source_id": "...", "title": "..."}
        # Ragas needs the actual context text. We will need to re-retrieve or modify the chat response to include context.
        # Since we just need to evaluate, let's re-run the retriever directly here to get the exact contexts.
        from app.rag.retriever import UFCRetriever
        retriever = UFCRetriever(session=session, embedder=embedder, k=4)
        docs = await retriever.ainvoke(question)
        contexts = [doc.page_content for doc in docs]
        contexts_list.append(contexts)

    # 3. Format as HuggingFace Dataset for Ragas
    data_dict = {
        "question": questions,
        "answer": answers,
        "contexts": contexts_list,
        "ground_truth": ground_truths,
    }

    dataset = Dataset.from_dict(data_dict)

    # 4. Initialize LLM and Embedder for Ragas evaluation
    llm = ChatGoogleGenerativeAI(
        model=settings.llm_model,
        google_api_key=SecretStr(settings.google_api_key),
    )
    eval_embedder = GoogleGenerativeAIEmbeddings(
        model=settings.embedding_model,
        google_api_key=SecretStr(settings.google_api_key),
    )

    # 5. Run Ragas evaluation
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

    # 6. Parse results into our Pydantic schema
    df = result.to_pandas()  # type: ignore[union-attr]
    question_results = []

    for i in range(len(df)):
        metrics = []
        for metric_name in ["faithfulness", "answer_relevancy", "context_precision", "context_recall"]:
            score = float(df.iloc[i].get(metric_name, 0.0))
            # Handle NaN
            import math
            if math.isnan(score):
                score = 0.0

            metrics.append(
                EvalMetricResult(
                    name=metric_name,
                    score=score,
                    reasoning=None  # Ragas returns reasoning in newer versions, but we'll leave it None for simplicity unless we parse it.
                )
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
        k: (0.0 if __import__('math').isnan(v) else float(v))
        for k, v in result.items()  # type: ignore[union-attr]
    }

    return EvalRunResult(
        run_id=str(uuid.uuid4()),
        dataset_name="eval_dataset.json",
        overall_scores=overall_scores,
        question_results=question_results,
    )
