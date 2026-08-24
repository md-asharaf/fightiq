
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import EvalRun


class EvalRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_eval_run(self, dataset_name: str, overall_scores: dict, question_results: list) -> EvalRun:
        eval_run = EvalRun(
            dataset_name=dataset_name,
            overall_scores=overall_scores,
            question_results=question_results
        )
        self.session.add(eval_run)
        await self.session.commit()
        await self.session.refresh(eval_run)
        return eval_run

    async def get_all_runs(self) -> list[EvalRun]:
        stmt = select(EvalRun).order_by(EvalRun.created_at.desc())
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
