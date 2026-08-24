"""Application configuration loaded from environment variables via pydantic-settings."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve project root regardless of which directory the process started from.
# This file is at: backend/app/core/config.py
# Project root:    backend/app/core/config.py -> ../../.. -> backend/ -> ../
_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent  # …/FightIQ/backend
_PROJECT_ROOT = _BACKEND_DIR.parent                            # …/FightIQ


class Settings(BaseSettings):
    """Central application settings — single source of truth for all config."""

    model_config = SettingsConfigDict(
        # Search for .env in backend/ first, then project root.
        # Covers: Docker (env vars injected), local dev (project root .env),
        # and pytest running from backend/.
        env_file=(
            str(_BACKEND_DIR / ".env"),
            str(_PROJECT_ROOT / ".env"),
        ),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── Application ───────────────────────────────────────────────────────────
    app_name: str = "FightIQ"
    environment: str = "development"
    log_level: str = "INFO"
    api_v1_prefix: str = "/api/v1"

    # ── Database ──────────────────────────────────────────────────────────────
    database_url: str

    # ── Google / Gemini ───────────────────────────────────────────────────────
    google_api_key: str
    llm_model: str = "gemini-2.0-flash"
    embedding_model: str = "models/text-embedding-004"
    embedding_dimensions: int = 768

    # ── Ingestion ─────────────────────────────────────────────────────────────
    chunk_size: int = 800
    chunk_overlap: int = 120

    # ── CORS ──────────────────────────────────────────────────────────────────
    backend_cors_origins: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
    ]

    @field_validator("backend_cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Any) -> list[str]:
        """Parse CORS origins from JSON string or list."""
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
            except json.JSONDecodeError:
                # Treat as a single origin
                return [v]
        return v


settings = Settings()
