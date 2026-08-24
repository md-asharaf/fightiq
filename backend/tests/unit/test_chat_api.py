import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test",
    ) as c:
        yield c


@pytest.mark.asyncio
async def test_get_chat_history_not_found(client: AsyncClient):
    response = await client.get(f"/api/chat/history/{uuid.uuid4()}")
    assert response.status_code == 404
    assert response.json()["detail"] == "Session not found"


@pytest.mark.asyncio
async def test_delete_chat_history(client: AsyncClient):
    # Call the endpoint to create a session first
    msg_response = await client.post(
        "/api/chat/message",
        json={"message": "test", "stream": False}
    )
    assert msg_response.status_code == 200
    session_id = msg_response.json()["session_id"]

    # Delete the session
    response = await client.delete(f"/api/chat/history/{session_id}")
    assert response.status_code == 204

    # Verify it is deleted
    response_check = await client.get(f"/api/chat/history/{session_id}")
    assert response_check.status_code == 404


@pytest.mark.asyncio
async def test_get_chat_history_success(client: AsyncClient):
    msg_response = await client.post(
        "/api/chat/message",
        json={"message": "Hi", "stream": False}
    )
    assert msg_response.status_code == 200
    session_id = msg_response.json()["session_id"]

    response = await client.get(f"/api/chat/history/{session_id}")
    assert response.status_code == 200

    data = response.json()
    assert data["session_id"] == session_id
    assert len(data["messages"]) >= 2
    assert data["messages"][0]["role"] == "user"
    assert data["messages"][0]["content"] == "Hi"
    assert data["messages"][1]["role"] == "assistant"
