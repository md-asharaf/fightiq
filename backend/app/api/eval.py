from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import get_eval_service
from app.schemas.eval import EvalRunResult
from app.services.eval_service import EvalService

router = APIRouter()

@router.get("/run", response_model=EvalRunResult, status_code=status.HTTP_200_OK)
async def api_run_evaluation(
    eval_service: EvalService = Depends(get_eval_service),
):
    """Trigger a Ragas evaluation run using the dataset in data/eval/eval_dataset.json.
    """
    try:
        result = await eval_service.run_evaluation()
        return result
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Evaluation failed: {e!s}",
        )


@router.get("/results", response_model=list[EvalRunResult])
async def api_get_eval_results(
    eval_service: EvalService = Depends(get_eval_service)
):
    """Retrieve past evaluation results.
    """
    return await eval_service.get_results()
