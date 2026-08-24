from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, get_embedder
from app.db.models import EvalRun
from app.ingestion.embedder import Embedder
from app.rag.evaluation import run_evaluation
from app.schemas.eval import EvalRunResult

router = APIRouter()


@router.get("/run", response_model=EvalRunResult, status_code=status.HTTP_200_OK)
async def api_run_evaluation(
    db: AsyncSession = Depends(get_db),
    embedder: Embedder = Depends(get_embedder),
):
    """Trigger a Ragas evaluation run using the dataset in data/eval/eval_dataset.json.
    """
    try:
        result = await run_evaluation(db, embedder)

        # Save to database
        eval_run = EvalRun(
            dataset_name=result.dataset_name,
            overall_scores=result.overall_scores,
            question_results=[q.model_dump() for q in result.question_results]
        )
        db.add(eval_run)
        await db.commit()
        await db.refresh(eval_run)

        # Update result with DB ID
        result.run_id = str(eval_run.id)
        result.created_at = eval_run.created_at

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
async def api_get_eval_results(db: AsyncSession = Depends(get_db)):
    """Retrieve past evaluation results.
    """
    stmt = select(EvalRun).order_by(EvalRun.created_at.desc())
    result = await db.execute(stmt)
    runs = result.scalars().all()

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
