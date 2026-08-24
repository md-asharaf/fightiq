import json
import math
import sys
import uuid
from pathlib import Path
from unittest.mock import MagicMock

if "langchain_community.chat_models.vertexai" not in sys.modules:
    sys.modules["langchain_community.chat_models.vertexai"] = MagicMock()

from datasets import Dataset
from langchain_core.language_models import BaseChatModel
from ragas import evaluate
from ragas.metrics import (
    answer_relevancy,
    context_precision,
    context_recall,
    faithfulness,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ResourceNotFoundError
from app.core.interfaces import IEvalRepository
from app.schemas.eval import EvalMetricResult, EvalQuestionResult, EvalRunResult
from app.services.agent_factory import AgentFactory
from app.utils.embedder import Embedder
from app.utils.retriever import UFCRetriever


class EvalService:
    def __init__(
        self,
        eval_repository: IEvalRepository,
        db: AsyncSession,
        embedder: Embedder,
        llm: BaseChatModel,
        agent_factory: AgentFactory,
    ):
        self.repo = eval_repository
        self.db = db
        self.embedder = embedder
        self.llm = llm
        self.agent_factory = agent_factory

    async def _run_evaluation(self) -> EvalRunResult:
        """Run Ragas evaluation on the golden_dataset.json."""
        dataset_path = Path(__file__).parent.parent.parent / "data" / "eval" / "golden_dataset.json"
        if not dataset_path.exists():
            raise ResourceNotFoundError(f"Evaluation dataset not found at {dataset_path}")

        with open(dataset_path, encoding="utf-8") as f:
            eval_data = json.load(f)

        questions = []
        ground_truths = []
        answers = []
        contexts_list = []

        retriever = UFCRetriever(session=self.db, embedder=self.embedder, k=4)
        agent_executor = self.agent_factory.create_agent(filters=None)

        for item in eval_data:
            question = item["question"]
            questions.append(question)
            ground_truths.append(item["ground_truth"])

            # Use agent directly to get response
            result_ai = await agent_executor.ainvoke(
                {
                    "input": question,
                    "chat_history": [],
                }
            )
            answers.append(result_ai["output"])

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

        result = evaluate(
            dataset,
            metrics=[
                faithfulness,
                answer_relevancy,
                context_precision,
                context_recall,
            ],
            llm=self.llm,
            embeddings=self.embedder.langchain_embeddings,  # Ragas can take our standard Langchain Embeddings instance
        )
        df = result.to_pandas()  # type: ignore[union-attr]
        question_results = []

        for i in range(len(df)):
            metrics = []
            for metric_name in [
                "faithfulness",
                "answer_relevancy",
                "context_precision",
                "context_recall",
            ]:
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
            k: (0.0 if math.isnan(v) else float(v))
            for k, v in result.items()  # type: ignore[union-attr]
        }

        return EvalRunResult(
            run_id=str(uuid.uuid4()),
            dataset_name="eval_dataset.json",
            overall_scores=overall_scores,
            question_results=question_results,
        )

    async def run_evaluation(self) -> EvalRunResult:
        result = await self._run_evaluation()

        eval_run = await self.repo.create_eval_run(
            dataset_name=result.dataset_name,
            overall_scores=result.overall_scores,
            question_results=[q.model_dump() for q in result.question_results],
        )
        await self.db.commit()

        result.run_id = str(eval_run.id)
        result.created_at = eval_run.created_at
        return result

    async def get_results(self) -> list[EvalRunResult]:
        runs = await self.repo.get_all_runs()
        return [
            EvalRunResult(
                run_id=str(r.id),
                dataset_name=r.dataset_name,
                overall_scores=r.overall_scores,
                question_results=r.question_results,
                created_at=r.created_at,
            )
            for r in runs
        ]
