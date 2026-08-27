from typing import Any

from sqlalchemy import func
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Event, Fight, Fighter
from app.repositories.base_repository import BaseRepository


class KnowledgeGraphRepository(BaseRepository[Fighter]):
    def __init__(self, session: AsyncSession):
        super().__init__(Fighter, session)

    async def _upsert_model(
        self, model_class: Any, data: dict[str, Any], index_elements: list[str]
    ) -> None:
        """Generic upsert method for SQLAlchemy models."""
        stmt = insert(model_class).values(**data)
        update_dict = {c.name: c for c in stmt.excluded if c.name not in ["id", "created_at", "fetched_at", *index_elements]}

        # Always update verification and modification timestamps if they exist on the model
        if hasattr(model_class, "last_verified_at"):
            update_dict["last_verified_at"] = func.now()  # type: ignore
        if hasattr(model_class, "last_updated"):
            update_dict["last_updated"] = func.now()  # type: ignore

        if not update_dict:
            update_stmt = stmt.on_conflict_do_nothing(index_elements=index_elements)
        else:
            update_stmt = stmt.on_conflict_do_update(
                index_elements=index_elements, set_=update_dict
            )
        await self.session.execute(update_stmt)

    async def upsert_fighter(self, data: dict[str, Any]) -> None:
        """Upsert a fighter record based on the name."""
        await self._upsert_model(Fighter, data, index_elements=["name"])

    async def upsert_event(self, data: dict[str, Any]) -> None:
        """Upsert an event record based on the name."""
        await self._upsert_model(Event, data, index_elements=["name"])

    async def upsert_fight(self, data: dict[str, Any]) -> None:
        """Upsert a fight record based on event and fighters."""
        await self._upsert_model(Fight, data, index_elements=["event_id", "fighter_a_id", "fighter_b_id"])
