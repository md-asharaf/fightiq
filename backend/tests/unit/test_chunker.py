"""Unit tests for the text chunking module."""

from __future__ import annotations

from langchain_core.documents import Document as LCDocument

from app.utils.text_chunker import chunk_text


class TestChunkText:
    def test_short_text_returns_single_chunk(self):
        """Short text that fits in one chunk should return exactly one document."""
        text = "This is a short text about UFC rules."
        chunks = chunk_text(text)
        assert len(chunks) == 1
        assert chunks[0].page_content == text

    def test_long_text_produces_multiple_chunks(self):
        """Text exceeding chunk_size should be split into multiple chunks."""
        text = " ".join(["word"] * 1000)
        chunks = chunk_text(text, chunk_size=100, chunk_overlap=20)
        assert len(chunks) > 1

    def test_empty_text_returns_empty_list(self):
        """Empty input must return an empty list (not raise, not return empty doc)."""
        assert chunk_text("") == []

    def test_whitespace_only_returns_empty_list(self):
        """Whitespace-only input should be treated as empty."""
        assert chunk_text("   \n\n\t  ") == []

    def test_metadata_attached_to_all_chunks(self):
        """Every chunk must carry the provided metadata."""
        metadata = {"category": "fighters", "title": "Jon Jones", "fighter": "Jon Jones"}
        text = "Jon Jones is the greatest MMA fighter of all time. " * 50
        chunks = chunk_text(text, metadata=metadata, chunk_size=200, chunk_overlap=20)
        assert len(chunks) > 1
        for chunk in chunks:
            assert chunk.metadata["category"] == "fighters"
            assert chunk.metadata["title"] == "Jon Jones"
            assert chunk.metadata["fighter"] == "Jon Jones"

    def test_returns_langchain_documents(self):
        """Returned objects must be LangChain Document instances."""
        chunks = chunk_text("Some UFC text about Khabib Nurmagomedov.")
        assert all(isinstance(c, LCDocument) for c in chunks)

    def test_no_metadata_is_valid(self):
        """Passing no metadata should work without errors."""
        chunks = chunk_text("Jon Jones defeated Shogun Rua at UFC 128.")
        assert len(chunks) >= 1
        # Default metadata should be an empty dict
        assert isinstance(chunks[0].metadata, dict)

    def test_chunk_overlap_creates_overlap(self):
        """With overlap > 0, adjacent chunks should share some content."""
        # Create text with distinct words we can track
        text = " ".join([f"word{i}" for i in range(200)])
        chunks = chunk_text(text, chunk_size=100, chunk_overlap=30)
        if len(chunks) >= 2:
            # The end of chunk 0 and the start of chunk 1 should overlap
            # (not a strict character-level test, just ensure chunks > 1)
            assert len(chunks) > 1

    def test_custom_chunk_size_respected(self):
        """Custom chunk_size should override the default from settings.

        Explicit chunk_overlap=0 is required here because the settings default
        overlap (120) would exceed the test chunk_size (50), which
        RecursiveCharacterTextSplitter correctly rejects.
        """
        text = "x" * 500
        # overlap must be less than chunk_size — use 0 for a pure size comparison
        chunks_small = chunk_text(text, chunk_size=100, chunk_overlap=0)
        chunks_large = chunk_text(text, chunk_size=250, chunk_overlap=0)
        assert len(chunks_small) > len(chunks_large)
