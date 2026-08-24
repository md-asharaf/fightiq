import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator


class ChatMessage(BaseModel):
    """A single chat message."""

    role: str = Field(description="Role of the sender: 'user' or 'assistant'")
    content: str = Field(description="Content of the message")
    sources: list[dict[str, Any]] | None = Field(
        default=None, description="Sources used for this answer, if any"
    )


class ChatRequest(BaseModel):
    """Request to send a message to the chat API."""

    session_id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        description="Session ID to maintain conversation history. If omitted, a new session is created.",
    )
    message: str = Field(description="The user's message")
    stream: bool = Field(default=True, description="Whether to stream the response via SSE")
    filters: dict[str, Any] | None = Field(
        default=None,
        description="Optional metadata filters for retrieval (e.g., {'category': 'fighters'})",
    )

    @field_validator("session_id", mode="before")
    @classmethod
    def validate_session_id(cls, v: str | None) -> str:
        if v:
            try:
                uuid.UUID(v)
                return v
            except ValueError:
                pass
        return str(uuid.uuid4())


class ChatResponse(BaseModel):
    """Response from a non-streaming chat request."""

    session_id: str
    message: ChatMessage


class ChatHistory(BaseModel):
    """Response containing conversation history."""

    session_id: str
    messages: list[ChatMessage]


class ChatSessionPreview(BaseModel):
    """Preview of a chat session for the sidebar."""

    session_id: str
    created_at: datetime
    preview_text: str
