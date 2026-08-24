"""Text chunking using LangChain's RecursiveCharacterTextSplitter."""

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
    """
    Split text into overlapping chunks, each carrying metadata.

    Uses RecursiveCharacterTextSplitter with MMA-friendly separators
    (section headers → paragraphs → sentences → words).

    Args:
        text: The raw document text to split.
        metadata: Key-value pairs attached to every generated chunk.
        chunk_size: Override the default chunk size from settings.
                    Pass an explicit int (including 0) to override.
        chunk_overlap: Override the default overlap from settings.
                       Pass 0 for no overlap.

    Returns:
        List of LangChain Documents (page_content + metadata).
        Returns an empty list for empty or whitespace-only input.
    """
    if not text or not text.strip():
        return []

    # Use is-None checks so that passing 0 is treated as a valid override.
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
