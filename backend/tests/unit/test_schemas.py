"""Unit tests for Pydantic schemas."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from app.schemas.chunk import SimilaritySearchRequest
from app.schemas.document import (
    DocumentRead,
    IngestResponse,
    IngestScrapeRequest,
    IngestSeedRequest,
)


class TestIngestSeedRequest:
    def test_default_force_false(self):
        req = IngestSeedRequest()
        assert req.force is False

    def test_force_true(self):
        req = IngestSeedRequest(force=True)
        assert req.force is True


class TestIngestScrapeRequest:
    def test_valid_request(self):
        req = IngestScrapeRequest(topics=["Jon Jones", "Conor McGregor"], category="fighters")
        assert len(req.topics) == 2
        assert req.category == "fighters"

    def test_default_category(self):
        req = IngestScrapeRequest(topics=["UFC history"])
        assert req.category == "general"

    def test_invalid_category_raises(self):
        with pytest.raises(ValidationError) as exc_info:
            IngestScrapeRequest(topics=["Jon Jones"], category="invalid_category")
        assert "pattern" in str(exc_info.value).lower() or "category" in str(exc_info.value).lower()

    def test_empty_topics_raises(self):
        with pytest.raises(ValidationError):
            IngestScrapeRequest(topics=[])

    def test_all_valid_categories(self):
        for cat in ("fighters", "events", "history", "rules", "general"):
            req = IngestScrapeRequest(topics=["test"], category=cat)
            assert req.category == cat


class TestDocumentRead:
    def _make_doc_read(self, **overrides) -> DocumentRead:
        defaults = dict(
            id=uuid.uuid4(),
            title="Jon Jones",
            source="data/fighters/jon_jones.md",
            category="fighters",
            source_type="seed",
            chunk_count=10,
            metadata={"fighter": "Jon Jones"},
            is_active=True,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        defaults.update(overrides)
        return DocumentRead(**defaults)  # type: ignore[arg-type]

    def test_valid_document_read(self):
        doc = self._make_doc_read()
        assert doc.title == "Jon Jones"
        assert doc.category == "fighters"

    def test_metadata_defaults_to_empty_dict(self):
        doc = self._make_doc_read(metadata={})
        assert doc.metadata == {}

    def test_chunk_count_zero_is_valid(self):
        doc = self._make_doc_read(chunk_count=0)
        assert doc.chunk_count == 0

    def test_uuid_field(self):
        doc_id = uuid.uuid4()
        doc = self._make_doc_read(id=doc_id)
        assert doc.id == doc_id


class TestIngestResponse:
    def test_valid_response(self):
        resp = IngestResponse(
            message="Done",
            documents_created=5,
            chunks_created=42,
        )
        assert resp.documents_created == 5
        assert resp.chunks_created == 42


class TestSimilaritySearchRequest:
    def test_valid_request(self):
        req = SimilaritySearchRequest(query="Who is Jon Jones?")
        assert req.query == "Who is Jon Jones?"
        assert req.k == 5
        assert req.category is None

    def test_invalid_empty_query_raises(self):
        with pytest.raises(ValidationError):
            SimilaritySearchRequest(query="")

    def test_k_bounds(self):
        with pytest.raises(ValidationError):
            SimilaritySearchRequest(query="test", k=0)  # type: ignore[call-arg]
        with pytest.raises(ValidationError):
            SimilaritySearchRequest(query="test", k=21)  # type: ignore[call-arg]

    def test_valid_category_filter(self):
        req = SimilaritySearchRequest(query="test", category="fighters")
        assert req.category == "fighters"

    def test_invalid_category_raises(self):
        with pytest.raises(ValidationError):
            SimilaritySearchRequest(query="test", category="unknown")
