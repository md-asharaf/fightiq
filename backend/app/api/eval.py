from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, get_embedder
from app.ingestion.embedder import Embedder
from app.rag.evaluation import run_evaluation
from app.schemas.eval import EvalRunResult

router = APIRouter()

_eval_results: list[EvalRunResult] = []


@router.get("/run", response_model=EvalRunResult, status_code=status.HTTP_200_OK)
async def api_run_evaluation(
    session: AsyncSession = Depends(get_db),
    embedder: Embedder = Depends(get_embedder),
):
    """Trigger a Ragas evaluation run using the dataset in data/eval/eval_dataset.json.
    """
    try:
        result = await run_evaluation(session, embedder)
        _eval_results.append(result)
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
async def api_get_eval_results():
    """Retrieve past evaluation results.
    """
    return _eval_results
