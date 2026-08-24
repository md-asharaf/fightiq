import uuid
from typing import Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert

from app.db.models import Fighter, Event
from app.repositories.base_repository import BaseRepository

class KnowledgeGraphRepository(BaseRepository[Fighter]):
    def __init__(self, session: AsyncSession):
        super().__init__(Fighter, session)

    async def _upsert_model(self, model_class: Any, data: dict[str, Any], index_elements: list[str]) -> None:
        """Generic upsert method for SQLAlchemy models."""
        stmt = insert(model_class).values(**data)
        update_dict = {
            c.name: c
            for c in stmt.excluded
            if c.name not in ["id", *index_elements]
        }
        if not update_dict:
            update_stmt = stmt.on_conflict_do_nothing(index_elements=index_elements)
        else:
            update_stmt = stmt.on_conflict_do_update(
                index_elements=index_elements,
                set_=update_dict
            )
        await self.session.execute(update_stmt)

    async def upsert_fighter(self, data: dict[str, Any]) -> None:
        """Upsert a fighter record based on the name."""
        await self._upsert_model(Fighter, data, index_elements=["name"])

    async def upsert_event(self, data: dict[str, Any]) -> None:
        """Upsert an event record based on the name."""
        await self._upsert_model(Event, data, index_elements=["name"])
