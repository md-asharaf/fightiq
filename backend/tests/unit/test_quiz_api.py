import uuid
from collections.abc import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.dependencies import get_db
from app.main import app


# Mock get_db
async def override_get_db():
    mock_session = AsyncMock()
    # For /sessions
    mock_result = MagicMock()
    mock_result.scalars().all.return_value = []
    mock_result.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_result
    yield mock_session


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as c:
        yield c


@pytest.mark.asyncio
async def test_api_submit_quiz_not_found(client: AsyncClient):
    """Test submitting answers for a non-existent quiz session."""
    session_id = str(uuid.uuid4())
    response = await client.post(
        "/api/quiz/submit",
        json={"session_id": session_id, "answers": {}},
    )
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_api_list_quiz_sessions(client: AsyncClient):
    """Test listing quiz sessions."""
    # This will just hit the DB; if it's empty, it should return []
    response = await client.get("/api/quiz/sessions")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
