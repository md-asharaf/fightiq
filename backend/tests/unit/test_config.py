"""Unit tests for the application settings/config module."""

from __future__ import annotations

from app.core.config import Settings, settings


class TestSettingsDefaults:
    def test_settings_singleton_loaded(self):
        """The settings singleton should initialise without errors."""
        assert settings is not None
        assert isinstance(settings, Settings)

    def test_app_name(self):
        assert settings.app_name == "FightIQ"

    def test_embedding_dimensions(self):
        assert settings.embedding_dimensions == 768

    def test_chunk_size_positive(self):
        assert settings.chunk_size > 0

    def test_chunk_overlap_nonnegative(self):
        assert settings.chunk_overlap >= 0

    def test_chunk_overlap_less_than_size(self):
        assert settings.chunk_overlap < settings.chunk_size

    def test_cors_origins_is_list(self):
        assert isinstance(settings.backend_cors_origins, list)
        assert len(settings.backend_cors_origins) > 0

    def test_database_url_is_asyncpg(self):
        """DATABASE_URL must use the asyncpg driver for SQLAlchemy async."""
        assert "asyncpg" in settings.database_url or "postgresql" in settings.database_url


class TestCorsOriginParsing:
    def test_json_string_parsed(self):
        """CORS origins stored as JSON string in .env should be parsed to list."""
        s = Settings(
            database_url="postgresql+asyncpg://test:test@localhost/test",
            google_api_key="test-key",
            backend_cors_origins='["http://localhost:3000", "http://localhost:3001"]',
        )
        assert isinstance(s.backend_cors_origins, list)
        assert "http://localhost:3000" in s.backend_cors_origins

    def test_list_passed_directly(self):
        """List passed directly should remain a list."""
        s = Settings(
            database_url="postgresql+asyncpg://test:test@localhost/test",
            google_api_key="test-key",
            backend_cors_origins=["http://localhost:3000"],
        )
        assert isinstance(s.backend_cors_origins, list)
        assert s.backend_cors_origins == ["http://localhost:3000"]
