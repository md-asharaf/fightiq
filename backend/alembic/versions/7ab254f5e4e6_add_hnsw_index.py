"""add hnsw index

Revision ID: 7ab254f5e4e6
Revises: c7f1c8ec704f
Create Date: 2026-08-27 15:23:32.685586

"""
from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '7ab254f5e4e6'
down_revision: str | Sequence[str] | None = 'c7f1c8ec704f'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("CREATE INDEX IF NOT EXISTS ix_chunks_embedding_hnsw ON chunks USING hnsw (embedding vector_cosine_ops)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_semantic_cache_embedding_hnsw ON semantic_tool_cache USING hnsw (query_embedding vector_cosine_ops)")


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP INDEX IF EXISTS ix_semantic_cache_embedding_hnsw")
    op.execute("DROP INDEX IF EXISTS ix_chunks_embedding_hnsw")
