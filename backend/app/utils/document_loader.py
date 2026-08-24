from __future__ import annotations

import io
import json
from pathlib import Path

from app.core.logging import get_logger

log = get_logger(__name__)


def load_text(content: bytes) -> str:
    """Decode bytes as UTF-8 text (for .txt and .md files)."""
    return content.decode("utf-8", errors="replace")


def load_pdf(content: bytes) -> str:
    """Extract text from a PDF using pypdf"""
    try:
        from pypdf import PdfReader
    except ImportError as exc:
        raise RuntimeError(
            "pypdf is not installed. Add 'pypdf>=4.0.0' to dependencies.",
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
    """Convert a JSON document to a readable text representation."""
    try:
        data = json.loads(content.decode("utf-8"))
        return json.dumps(data, indent=2, ensure_ascii=False)
    except json.JSONDecodeError as exc:
        log.warning("Failed to parse JSON, falling back to raw text", error=str(exc))
        return content.decode("utf-8", errors="replace")


def load_file(content: bytes, filename: str) -> str:
    """Dispatch to the appropriate loader based on file extension."""
    ext = Path(filename).suffix.lower()
    log.info("Loading document", filename=filename, extension=ext)

    if ext in {".txt", ".md", ".markdown"}:
        return load_text(content)
    if ext == ".pdf":
        return load_pdf(content)
    if ext == ".json":
        return load_json(content)
    log.warning("Unknown file extension — attempting text decode", filename=filename)
    return load_text(content)


def load_file_from_path(path: Path) -> str:
    """Convenience wrapper to load a document from a filesystem path."""
    content = path.read_bytes()
    return load_file(content, path.name)
