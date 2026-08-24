"""Document loaders for various file formats (.txt, .md, .pdf, .json)."""

from __future__ import annotations

import io
import json
from pathlib import Path

from app.core.logging import get_logger

log = get_logger(__name__)


def load_text(content: bytes, filename: str = "") -> str:
    """Decode bytes as UTF-8 text (for .txt and .md files)."""
    return content.decode("utf-8", errors="replace")


def load_pdf(content: bytes) -> str:
    """
    Extract text from a PDF using pypdf.

    Each page is separated by a blank line to preserve semantic boundaries
    during chunking.
    """
    try:
        from pypdf import PdfReader
    except ImportError as exc:
        raise RuntimeError(
            "pypdf is not installed. Add 'pypdf>=4.0.0' to dependencies."
        ) from exc

    reader = PdfReader(io.BytesIO(content))
    pages: list[str] = []
    for page_num, page in enumerate(reader.pages):
        text = page.extract_text()
        if text and text.strip():
            pages.append(text.strip())
        else:
            log.debug("PDF page yielded no text", page=page_num)

    return "\n\n".join(pages)


def load_json(content: bytes) -> str:
    """
    Convert a JSON document to a readable text representation.

    Useful for ingesting structured UFC data (fighter stats, event results, etc.)
    as plain text for chunking.
    """
    try:
        data = json.loads(content.decode("utf-8"))
        return json.dumps(data, indent=2, ensure_ascii=False)
    except json.JSONDecodeError as exc:
        log.warning("Failed to parse JSON, falling back to raw text", error=str(exc))
        return content.decode("utf-8", errors="replace")


def load_file(content: bytes, filename: str) -> str:
    """
    Dispatch to the appropriate loader based on file extension.

    Raises:
        ValueError: For unsupported extensions after a fallback attempt.
    """
    ext = Path(filename).suffix.lower()
    log.info("Loading document", filename=filename, extension=ext)

    if ext in {".txt", ".md", ".markdown"}:
        return load_text(content, filename)
    elif ext == ".pdf":
        return load_pdf(content)
    elif ext == ".json":
        return load_json(content)
    else:
        # Best-effort: attempt UTF-8 text decode
        log.warning("Unknown file extension — attempting text decode", filename=filename)
        return load_text(content, filename)


def load_file_from_path(path: Path) -> str:
    """Convenience wrapper to load a document from a filesystem path."""
    content = path.read_bytes()
    return load_file(content, path.name)
