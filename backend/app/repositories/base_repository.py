import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import Base


class BaseRepository[ModelType: Base]:
    def __init__(self, model: type[ModelType], session: AsyncSession):
        self.model = model
        self.session = session

    async def get_by_id(self, id: uuid.UUID | str) -> ModelType | None:
        return await self.session.get(self.model, id)

    def add(self, obj: ModelType) -> ModelType:
        self.session.add(obj)
        return obj

    async def delete(self, obj: ModelType) -> None:
        await self.session.delete(obj)
