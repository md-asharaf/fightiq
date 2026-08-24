import uuid
from collections.abc import Sequence

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Document
from app.repositories.base_repository import BaseRepository


class DocumentRepository(BaseRepository[Document]):
    def __init__(self, session: AsyncSession):
        super().__init__(Document, session)

    async def get_document(self, document_id: uuid.UUID) -> Document | None:
        return await self.get_by_id(document_id)
        
    async def document_exists(self, source: str) -> bool:
        """Return True if a document with this source path is already in the DB."""
        stmt = select(Document.id).where(Document.source == source).limit(1)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none() is not None
        
    async def create_document(self, doc: Document) -> Document:
        """Add a new document to the database."""
        self.session.add(doc)
        await self.session.flush()
        return doc

    async def get_documents(
        self,
        category: str | None = None,
        source_type: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[Sequence[Document], int]:
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
        return rows, total

    async def soft_delete(self, doc: Document) -> None:
        doc.is_active = False
        await self.session.commit()
