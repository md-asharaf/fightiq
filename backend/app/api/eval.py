from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.core.dependencies import get_eval_service
from app.schemas.eval import EvalRunResult
from app.services.eval_service import EvalService

router = APIRouter()

EvalServiceDep = Annotated[EvalService, Depends(get_eval_service)]

@router.post("/run", response_model=EvalRunResult, status_code=status.HTTP_200_OK)
async def api_run_evaluation(
    eval_service: EvalServiceDep,
):
    """Trigger a Ragas evaluation run using the dataset in data/eval/eval_dataset.json.
    """
    return await eval_service.run_evaluation()


@router.get("/results", response_model=list[EvalRunResult])
async def api_get_eval_results(
    eval_service: EvalServiceDep
):
    """Retrieve past evaluation results.
    """
    return await eval_service.get_results()
