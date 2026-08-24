import pytest
from httpx import ASGITransport, AsyncClient

from app.api.v1.chat import _chat_history_metadata, _chat_sessions
from app.main import app
from app.schemas.chat import ChatMessage


@pytest.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c


@pytest.fixture(autouse=True)
def clear_chat_memory():
    """Clear in-memory chat state before each test."""
    _chat_sessions.clear()
    _chat_history_metadata.clear()
    yield
    _chat_sessions.clear()
    _chat_history_metadata.clear()


@pytest.mark.asyncio
async def test_get_chat_history_not_found(client: AsyncClient):
    response = await client.get("/api/v1/chat/history/invalid-session")
    assert response.status_code == 404
    assert response.json()["detail"] == "Session not found"


@pytest.mark.asyncio
async def test_delete_chat_history(client: AsyncClient):
    # Setup some fake memory
    session_id = "test-session"
    _chat_sessions[session_id] = []
    _chat_history_metadata[session_id] = [
        ChatMessage(role="user", content="Hi")
    ]

    response = await client.delete(f"/api/v1/chat/history/{session_id}")
    assert response.status_code == 204

    # Verify memory is cleared
    assert session_id not in _chat_sessions
    assert session_id not in _chat_history_metadata


@pytest.mark.asyncio
async def test_get_chat_history_success(client: AsyncClient):
    session_id = "test-session-2"
    _chat_sessions[session_id] = []
    _chat_history_metadata[session_id] = [
        ChatMessage(role="user", content="Hi"),
        ChatMessage(role="assistant", content="Hello!")
    ]

    response = await client.get(f"/api/v1/chat/history/{session_id}")
    assert response.status_code == 200

    data = response.json()
    assert data["session_id"] == session_id
    assert len(data["messages"]) == 2
    assert data["messages"][0]["role"] == "user"
    assert data["messages"][0]["content"] == "Hi"
    assert data["messages"][1]["role"] == "assistant"
