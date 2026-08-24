from __future__ import annotations

import json
import uuid
from collections.abc import AsyncGenerator
from pathlib import Path

from app.core.exceptions import ValidationError
from app.core.logging import get_logger
from app.db.models import Chunk, Document
from app.repositories.chunk_repository import ChunkRepository
from app.repositories.document_repository import DocumentRepository
from app.utils.document_loader import load_file, load_file_from_path
from app.utils.embedder import Embedder
from app.utils.scraper import scrape_topics_generator
from app.utils.text_chunker import chunk_text

log = get_logger(__name__)

EMBED_BATCH_SIZE = 50


class IngestionService:
    ALLOWED_EXTENSIONS = {".txt", ".md", ".pdf", ".json"}
    MAX_FILE_SIZE = 10 * 1024 * 1024
    VALID_CATEGORIES = {"fighters", "events", "history", "rules", "general"}

    def __init__(
        self,
        doc_repo: DocumentRepository,
        chunk_repo: ChunkRepository,
        embedder: Embedder,
    ):
        self.doc_repo = doc_repo
        self.chunk_repo = chunk_repo
        self.embedder = embedder

    async def ingest_text(
        self,
        *,
        text: str,
        title: str,
        source: str,
        category: str,
        source_type: str,
        metadata: dict,
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
        doc = await self.doc_repo.create_document(doc)

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
            await self.doc_repo.commit()
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
            embeddings = await self.embedder.aembed_documents(batch_texts)

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

        await self.chunk_repo.add_chunks(chunk_records)
        doc.chunk_count = len(chunk_records)
        await self.doc_repo.commit()

        log.info(
            "Document ingested",
            title=title,
            document_id=str(doc.id),
            chunks=len(chunk_records),
        )
        return doc

    async def ingest_bytes(
        self,
        *,
        content: bytes,
        filename: str,
        category: str,
        source_type: str = "upload",
        metadata: dict | None = None,
    ) -> Document:
        """Ingest a document from raw bytes (used for file uploads) with validation."""
        if not filename:
            raise ValidationError("Filename is required.")

        ext = Path(filename).suffix.lower()
        if ext not in self.ALLOWED_EXTENSIONS:
            raise ValidationError(
                f"Unsupported file type '{ext}'. Allowed: {sorted(self.ALLOWED_EXTENSIONS)}"
            )

        if category not in self.VALID_CATEGORIES:
            raise ValidationError(
                f"Invalid category '{category}'. Allowed: {sorted(self.VALID_CATEGORIES)}"
            )

        if not content:
            raise ValidationError("Uploaded file is empty.")

        if len(content) > self.MAX_FILE_SIZE:
            raise ValidationError(
                f"File too large. Maximum size: {self.MAX_FILE_SIZE // (1024 * 1024)} MB."
            )

        meta = metadata or {}
        meta.setdefault("original_filename", filename)
        meta.setdefault("category", category)

        text = load_file(content, filename)
        return await self.ingest_text(
            text=text,
            title=filename,
            source=filename,
            category=category,
            source_type=source_type,
            metadata=meta,
        )

    async def ingest_path(
        self,
        *,
        path: Path,
        category: str,
        source_type: str,
        metadata: dict,
    ) -> Document:
        """Ingest a document from a filesystem path (used for seed data)."""
        text = load_file_from_path(path)
        human_title = path.stem.replace("_", " ").title()
        meta = {**metadata, "filename": path.name}
        return await self.ingest_text(
            text=text,
            title=human_title,
            source=str(path.resolve()),
            category=category,
            source_type=source_type,
            metadata=meta,
        )

    async def scrape_and_ingest_stream(
        self,
        topics: list[str],
        category: str,
    ) -> AsyncGenerator[str, None]:
        """Streams Server-Sent Events (SSE) detailing the progress of scraping and embedding."""
        total_chunks = 0
        success_count = 0

        for step in scrape_topics_generator(topics):
            if step["status"] == "scraping":
                yield f"data: {json.dumps(step)}\n\n"
            elif step["status"] == "success":
                item = step["data"]
                topic = step["topic"]
                yield f"data: {json.dumps({'status': 'embedding', 'topic': topic})}\n\n"

                try:
                    doc = await self.ingest_text(
                        text=item["content"],
                        title=item["title"],
                        source=item["url"],
                        category=category,
                        source_type="scraped",
                        metadata={
                            "url": item["url"],
                            "category": category,
                            "scraped_from": "web",
                        },
                    )
                    total_chunks += doc.chunk_count
                    success_count += 1
                    yield f"data: {json.dumps({'status': 'embedded', 'topic': topic, 'chunks': doc.chunk_count})}\n\n"
                except Exception as e:
                    yield f"data: {json.dumps({'status': 'error', 'topic': topic, 'message': str(e)})}\n\n"
            elif step["status"] == "error":
                yield f"data: {json.dumps(step)}\n\n"

        yield f"data: {json.dumps({'status': 'complete', 'documents_created': success_count, 'chunks_created': total_chunks})}\n\n"
