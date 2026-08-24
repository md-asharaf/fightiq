import pytest
from pydantic import ValidationError

from app.schemas.chat import ChatMessage, ChatRequest


def test_chat_message_schema():
    msg = ChatMessage(role="user", content="Who is Jon Jones?")
    assert msg.role == "user"
    assert msg.content == "Who is Jon Jones?"
    assert msg.sources is None

    msg_with_sources = ChatMessage(
        role="assistant",
        content="He is a fighter.",
        sources=[{"title": "jon_jones.md", "category": "fighters"}],
    )
    assert msg_with_sources.sources is not None
    assert len(msg_with_sources.sources) == 1
    assert msg_with_sources.sources[0]["title"] == "jon_jones.md"


def test_chat_request_defaults():
    req = ChatRequest(message="test message")
    assert req.stream is True
    assert req.session_id is not None
    assert req.filters is None


def test_chat_request_invalid_type():
    with pytest.raises(ValidationError):
        ChatRequest(message={"not": "a string"})  # type: ignore[arg-type]
