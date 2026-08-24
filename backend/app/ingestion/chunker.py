from __future__ import annotations

from langchain_core.documents import Document as LCDocument
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.core.config import settings
from app.core.logging import get_logger

log = get_logger(__name__)


def chunk_text(
    text: str,
    metadata: dict | None = None,
    chunk_size: int | None = None,
    chunk_overlap: int | None = None,
) -> list[LCDocument]:
    """Split text into overlapping chunks, each carrying metadata."""
    if not text or not text.strip():
        return []

    resolved_chunk_size = chunk_size if chunk_size is not None else settings.chunk_size
    resolved_overlap = chunk_overlap if chunk_overlap is not None else settings.chunk_overlap

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=resolved_chunk_size,
        chunk_overlap=resolved_overlap,
        length_function=len,
        separators=["\n\n", "\n", ". ", "! ", "? ", " ", ""],
    )

    docs = splitter.create_documents(
        texts=[text],
        metadatas=[metadata or {}],
    )

    log.debug(
        "Text chunked",
        num_chunks=len(docs),
        chunk_size=resolved_chunk_size,
        chunk_overlap=resolved_overlap,
    )
    return docs
