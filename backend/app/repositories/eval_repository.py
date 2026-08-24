from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import EvalRun
from app.repositories.base_repository import BaseRepository


class EvalRepository(BaseRepository[EvalRun]):
    def __init__(self, session: AsyncSession):
        super().__init__(EvalRun, session)

    async def create_eval_run(
        self, dataset_name: str, overall_scores: dict, question_results: list
    ) -> EvalRun:
        eval_run = EvalRun(
            dataset_name=dataset_name,
            overall_scores=overall_scores,
            question_results=question_results,
        )
        return self.add(eval_run)

    async def get_all_runs(self) -> Sequence[EvalRun]:
        stmt = select(EvalRun).order_by(EvalRun.created_at.desc())
        result = await self.session.execute(stmt)
        return result.scalars().all()
