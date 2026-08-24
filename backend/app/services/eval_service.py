from sqlalchemy.ext.asyncio import AsyncSession

from app.ingestion.embedder import Embedder
from app.rag.evaluation import run_evaluation
from app.repositories.eval_repository import EvalRepository
from app.schemas.eval import EvalRunResult


class EvalService:
    def __init__(self, eval_repository: EvalRepository, db: AsyncSession, embedder: Embedder):
        self.repo = eval_repository
        self.db = db
        self.embedder = embedder

    async def run_evaluation(self) -> EvalRunResult:
        result = await run_evaluation(self.db, self.embedder)

        eval_run = await self.repo.create_eval_run(
            dataset_name=result.dataset_name,
            overall_scores=result.overall_scores,
            question_results=[q.model_dump() for q in result.question_results]
        )

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
