import uuid
from collections.abc import Sequence

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Fighter


class FighterService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_fighters(self, q: str | None = None, limit: int = 50) -> Sequence[Fighter]:
        stmt = select(Fighter).order_by(Fighter.name)
        if q:
            stmt = stmt.where(Fighter.name.ilike(f"%{q}%"))
        stmt = stmt.limit(limit)
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def compare_fighters(self, f1_id: uuid.UUID, f2_id: uuid.UUID) -> tuple[Fighter, Fighter]:
        stmt = select(Fighter).where(Fighter.id.in_([f1_id, f2_id]))
        result = await self.db.execute(stmt)
        fighters = result.scalars().all()

        if len(fighters) != 2:
            if f1_id == f2_id and len(fighters) == 1:
                return fighters[0], fighters[0]
            raise HTTPException(status_code=404, detail="One or both fighters not found")

        f1 = next((f for f in fighters if f.id == f1_id), None)
        f2 = next((f for f in fighters if f.id == f2_id), None)

        if not f1 or not f2:
            raise HTTPException(status_code=404, detail="One or both fighters not found")

        return f1, f2
