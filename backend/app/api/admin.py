from typing import Annotated

from fastapi import APIRouter, Depends, Request, status

from app.core.dependencies import require_admin
from app.core.logging import get_logger
from app.db.auth_models import User

log = get_logger(__name__)
router = APIRouter(prefix="/admin", tags=["Admin"], dependencies=[Depends(require_admin)])

AdminUserDep = Annotated[User, Depends(require_admin)]


@router.post("/trigger/ufcstats", status_code=status.HTTP_202_ACCEPTED)
async def trigger_ufcstats_etl(request: Request):
    """Manually trigger the UFCStats ETL process via background worker."""
    try:
        redis = request.app.state.redis_pool
        await redis.enqueue_job("refresh_fighters_task")
        return {"message": "UFCStats ETL triggered successfully in the background."}
    except Exception as e:
        log.error(f"Failed to trigger UFCStats ETL: {e}")
        return {"error": str(e)}


@router.post("/trigger/rankings", status_code=status.HTTP_202_ACCEPTED)
async def trigger_rankings_etl(request: Request):
    """Manually trigger the Rankings ETL process via background worker."""
    try:
        redis = request.app.state.redis_pool
        await redis.enqueue_job("seed_rankings_task")
        return {"message": "Rankings ETL triggered successfully in the background."}
    except Exception as e:
        log.error(f"Failed to trigger Rankings ETL: {e}")
        return {"error": str(e)}



