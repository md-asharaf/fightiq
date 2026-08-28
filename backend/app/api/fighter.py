import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.dependencies import get_fighter_service
from app.services.fighter_service import FighterService

router = APIRouter()

class FighterBasic(BaseModel):
    id: uuid.UUID
    name: str
    weight_class: str | None = None
    record: str | None = None

class FighterDetailed(FighterBasic):
    height_cm: float | None = None
    reach_cm: float | None = None
    stance: str | None = None
    slpm: float | None = None
    str_acc: float | None = None
    sapm: float | None = None
    str_def: float | None = None
    td_avg: float | None = None
    td_acc: float | None = None
    td_def: float | None = None
    sub_avg: float | None = None
    is_champion: bool = False
    current_ranking: int | None = None

class ComparisonResponse(BaseModel):
    fighter1: FighterDetailed
    fighter2: FighterDetailed

class PaginatedFighterResponse(BaseModel):
    fighters: list[FighterBasic]
    next_offset: int | None = None

@router.get("/", response_model=PaginatedFighterResponse)
async def list_fighters(
    q: str | None = None,
    offset: int = 0,
    limit: int = 50,
    fighter_service: FighterService = Depends(get_fighter_service)
):
    """Return a lightweight paginated list of fighters for autocomplete/dropdowns."""
    results = await fighter_service.list_fighters(q, offset, limit)
    next_offset = offset + limit if len(results) == limit else None
    return PaginatedFighterResponse(fighters=list(results), next_offset=next_offset)

@router.get("/compare", response_model=ComparisonResponse)
async def compare_fighters(
    f1_id: uuid.UUID,
    f2_id: uuid.UUID,
    fighter_service: FighterService = Depends(get_fighter_service)
):
    """Return detailed stats for two fighters for comparison."""
    f1, f2 = await fighter_service.compare_fighters(f1_id, f2_id)
    return ComparisonResponse(fighter1=f1, fighter2=f2)
