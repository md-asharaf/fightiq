from __future__ import annotations

import uuid
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.db.models import Chunk, Document
from app.utils.document_loader import load_file, load_file_from_path
from app.utils.embedder import Embedder
from app.utils.text_chunker import chunk_text

log = get_logger(__name__)

EMBED_BATCH_SIZE = 50


async def ingest_text(
    *,
    text: str,
    title: str,
    source: str,
    category: str,
    source_type: str,
    metadata: dict,
    session: AsyncSession,
    embedder: Embedder,
) -> Document:
    """Core ingestion function — the entry point for all content into the RAG system."""
    doc = Document(
        id=uuid.uuid4(),
        title=title,
        source=source,
        category=category,
        source_type=source_type,
        metadata_=metadata,
        chunk_count=0,
    )
    session.add(doc)
    await session.flush()

    log.info("Ingestion started", title=title, category=category, source_type=source_type)

    chunk_metadata = {
        "document_id": str(doc.id),
        "title": title,
        "category": category,
        "source_type": source_type,
        **metadata,
    }
    lc_chunks = chunk_text(text, metadata=chunk_metadata)

    if not lc_chunks:
        log.warning("Document produced no chunks — skipping", title=title)
        await session.commit()
        return doc

    log.info("Document chunked", title=title, num_chunks=len(lc_chunks))

    chunk_records: list[Chunk] = []
    all_texts = [c.page_content for c in lc_chunks]

    for batch_start in range(0, len(all_texts), EMBED_BATCH_SIZE):
        batch_texts = all_texts[batch_start : batch_start + EMBED_BATCH_SIZE]
        batch_lc = lc_chunks[batch_start : batch_start + EMBED_BATCH_SIZE]

        log.debug(
            "Embedding batch",
            batch_start=batch_start,
            batch_size=len(batch_texts),
        )
        embeddings = await embedder.aembed_documents(batch_texts)

        for i, (lc_chunk, embedding) in enumerate(zip(batch_lc, embeddings)):
            chunk_records.append(
                Chunk(
                    id=uuid.uuid4(),
                    document_id=doc.id,
                    content=lc_chunk.page_content,
                    embedding=embedding,
                    chunk_index=batch_start + i,
                    metadata_=lc_chunk.metadata,
                ),
            )

    session.add_all(chunk_records)

    doc.chunk_count = len(chunk_records)

    await session.commit()

    log.info(
        "Document ingested",
        title=title,
        document_id=str(doc.id),
        chunks=len(chunk_records),
    )
    return doc


async def ingest_bytes(
    *,
    content: bytes,
    filename: str,
    category: str,
    source_type: str,
    metadata: dict,
    session: AsyncSession,
    embedder: Embedder,
) -> Document:
    """Ingest a document from raw bytes (used for file uploads)."""
    text = load_file(content, filename)
    return await ingest_text(
        text=text,
        title=filename,
        source=filename,
        category=category,
        source_type=source_type,
        metadata=metadata,
        session=session,
        embedder=embedder,
    )


async def ingest_path(
    *,
    path: Path,
    category: str,
    source_type: str,
    metadata: dict,
    session: AsyncSession,
    embedder: Embedder,
) -> Document:
    """Ingest a document from a filesystem path (used for seed data)."""
    text = load_file_from_path(path)
    human_title = path.stem.replace("_", " ").title()
    return await ingest_text(
        text=text,
        title=human_title,
        source=str(path.resolve()),
        category=category,
        source_type=source_type,
        metadata={**metadata, "filename": path.name},
        session=session,
        embedder=embedder,
    )
