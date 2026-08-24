from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
_PROJECT_ROOT = _BACKEND_DIR.parent


class Settings(BaseSettings):
    """Central application settings — single source of truth for all config."""

    model_config = SettingsConfigDict(
        env_file=(
            str(_BACKEND_DIR / ".env"),
            str(_PROJECT_ROOT / ".env"),
        ),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "FightIQ"
    environment: str = "development"
    log_level: str = "INFO"

    database_url: str

    google_api_key: str
    llm_model: str = "gemini-2.0-flash"
    embedding_model: str = "models/text-embedding-004"
    embedding_dimensions: int = 768

    chunk_size: int = 800
    chunk_overlap: int = 120

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
                return [v]
        return v


settings = Settings()
