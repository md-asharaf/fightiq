import uuid
from collections.abc import AsyncGenerator
from datetime import datetime
from unittest.mock import AsyncMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.dependencies import get_db, get_embedder, get_eval_service, require_admin
from app.db.auth_models import User
from app.main import app


# Mock get_db
async def override_get_db():
    yield AsyncMock()


# Mock get_embedder
def override_get_embedder():
    from unittest.mock import MagicMock

    mock = MagicMock()
    mock.aembed_query = AsyncMock(return_value=[0.1] * 1536)
    return mock


app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_embedder] = override_get_embedder


def override_require_admin():
    return User(
        id="test_admin_id",
        name="Admin User",
        email="admin@test.com",
        emailVerified=True,
        role="admin",
        createdAt=datetime.now(),
        updatedAt=datetime.now(),
    )


app.dependency_overrides[require_admin] = override_require_admin


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as c:
        yield c


@pytest.fixture
def mock_eval_service():
    mock = AsyncMock()
    app.dependency_overrides[get_eval_service] = lambda: mock
    yield mock
    app.dependency_overrides.pop(get_eval_service, None)


@pytest.mark.asyncio
async def test_api_get_eval_results(client: AsyncClient, mock_eval_service):
    """Test retrieving eval results (should be empty initially)."""
    mock_eval_service.get_results.return_value = []
    response = await client.get("/api/eval/results")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_api_run_evaluation_mock(client: AsyncClient, mock_eval_service):
    """Test triggering an evaluation run with mocked eval engine."""
    from app.schemas.eval import EvalRunResult

    mock_eval_service.run_evaluation.return_value = EvalRunResult(
        run_id=str(uuid.uuid4()),
        dataset_name="eval_dataset.json",
        overall_scores={"faithfulness": 0.95},
        question_results=[],
    )

    # The eval/run endpoint is POST, not GET
    response = await client.post("/api/eval/run")
    assert response.status_code == 200
    data = response.json()
    assert "run_id" in data
    assert data["overall_scores"]["faithfulness"] == 0.95
