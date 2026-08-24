import uuid
from unittest.mock import AsyncMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.dependencies import get_chat_service
from app.core.exceptions import ResourceNotFoundError
from app.main import app
from app.schemas.chat import ChatHistory, ChatMessage


@pytest.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test",
    ) as c:
        yield c


@pytest.fixture
def mock_chat_service():
    mock = AsyncMock()
    app.dependency_overrides[get_chat_service] = lambda: mock
    yield mock
    app.dependency_overrides.pop(get_chat_service, None)


@pytest.mark.asyncio
async def test_get_chat_history_not_found(client: AsyncClient, mock_chat_service):
    mock_chat_service.get_history.side_effect = ResourceNotFoundError("Session not found")

    response = await client.get(f"/api/chat/history/{uuid.uuid4()}")
    assert response.status_code == 404
    assert response.json()["detail"] == "Session not found"


@pytest.mark.asyncio
async def test_delete_chat_history(client: AsyncClient, mock_chat_service):
    session_id = str(uuid.uuid4())
    # process_message must return a ChatMessage-compatible dict
    mock_chat_service.process_message.return_value = ChatMessage(
        role="assistant", content="Mocked AI response"
    )

    msg_response = await client.post(
        "/api/chat/message",
        json={"session_id": session_id, "message": "test", "stream": False},
    )
    assert msg_response.status_code == 200

    mock_chat_service.delete_history.return_value = None
    response = await client.delete(f"/api/chat/history/{session_id}")
    assert response.status_code == 204


@pytest.mark.asyncio
async def test_get_chat_history_success(client: AsyncClient, mock_chat_service):
    session_id = str(uuid.uuid4())
    mock_chat_service.process_message.return_value = ChatMessage(
        role="assistant", content="Mocked AI response"
    )

    msg_response = await client.post(
        "/api/chat/message",
        json={"session_id": session_id, "message": "Hi", "stream": False},
    )
    assert msg_response.status_code == 200

    mock_chat_service.get_history.return_value = ChatHistory(
        session_id=session_id,
        messages=[
            ChatMessage(role="user", content="Hi"),
            ChatMessage(role="assistant", content="Mocked AI response"),
        ],
    )

    response = await client.get(f"/api/chat/history/{session_id}")
    assert response.status_code == 200

    data = response.json()
    assert data["session_id"] == session_id
    assert len(data["messages"]) >= 2
    assert data["messages"][0]["role"] == "user"
    assert data["messages"][0]["content"] == "Hi"
    assert data["messages"][1]["role"] == "assistant"
