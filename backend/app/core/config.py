from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    """Central application settings — single source of truth for all config."""

    model_config = SettingsConfigDict(
        env_file=(str(_BACKEND_DIR / ".env")),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "FightIQ"
    frontend_url: str
    environment: str
    log_level: str = "INFO"

    database_url: str
    redis_url: str = "redis://localhost:6379"

    @property
    def get_db_config(self) -> tuple[str, dict]:
        url = self.database_url

        url = url.replace("?sslmode=require", "?ssl=require").replace(
            "&sslmode=require", "&ssl=require"
        )

        connect_args = {}
        if "&options=" in url:
            base_url, options_part = url.split("&options=", 1)
            options_val = options_part.replace("%%3D", "=").replace("%3D", "=")
            connect_args = {"server_settings": {"options": options_val}}
            url = base_url
        elif "?options=" in url:
            base_url, options_part = url.split("?options=", 1)
            options_val = options_part.replace("%%3D", "=").replace("%3D", "=")
            connect_args = {"server_settings": {"options": options_val}}
            url = base_url

        return url, connect_args

    google_api_key: str
    gemini_model: str
    gemini_fallback_model: str = "gemini-3.5-flash-lite"
    exa_api_key: str
    groq_api_key: str
    groq_model: str
    groq_fallback_model: str = "qwen/qwen3.6-27b"
    embedding_model: str
    embedding_dimensions: int = 768

    chunk_size: int = 800
    chunk_overlap: int = 120

    backend_cors_origins: list[str]

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
