import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Document


class DocumentRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_document(self, document_id: uuid.UUID) -> Document | None:
        return await self.session.get(Document, document_id)

    async def get_documents(
        self,
        category: str | None = None,
        source_type: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Document], int]:
        base_stmt = select(Document).where(Document.is_active.is_(True))

        if category:
            base_stmt = base_stmt.where(Document.category == category)
        if source_type:
            base_stmt = base_stmt.where(Document.source_type == source_type)

        count_stmt = select(func.count()).select_from(base_stmt.subquery())
        total = (await self.session.execute(count_stmt)).scalar_one()

        paginated_stmt = (
            base_stmt.order_by(Document.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        rows = (await self.session.execute(paginated_stmt)).scalars().all()
        return list(rows), total

    async def soft_delete(self, doc: Document) -> None:
        doc.is_active = False
        await self.session.commit()
