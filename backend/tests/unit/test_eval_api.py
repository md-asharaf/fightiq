from collections.abc import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient
from pytest import MonkeyPatch

from app.core.dependencies import get_db, get_embedder
from app.main import app


# Mock get_db
async def override_get_db():
    from unittest.mock import AsyncMock
    yield AsyncMock()


# Mock get_embedder
def override_get_embedder():
    from unittest.mock import AsyncMock, MagicMock
    mock = MagicMock()
    mock.aembed_query = AsyncMock(return_value=[0.1] * 1536)
    return mock


app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_embedder] = override_get_embedder


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test",
    ) as c:
        yield c


@pytest.mark.asyncio
async def test_api_get_eval_results(client: AsyncClient):
    """Test retrieving eval results (should be empty initially)."""
    response = await client.get("/api/eval/results")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_api_run_evaluation_mock(client: AsyncClient, monkeypatch: MonkeyPatch):
    """Test triggering an evaluation run with mocked eval engine."""
    import uuid

    from app.schemas.eval import EvalRunResult

    # Mock run_evaluation to avoid real LLM calls and DB calls
    async def mock_run_evaluation(_session, _embedder):
        return EvalRunResult(
            run_id=str(uuid.uuid4()),
            dataset_name="eval_dataset.json",
            overall_scores={"faithfulness": 0.95},
            question_results=[],
        )

    # Note: since run_evaluation is imported directly in eval_service.py, we patch it in the target module
    monkeypatch.setattr("app.services.eval_service.run_evaluation", mock_run_evaluation)

    response = await client.get("/api/eval/run")
    assert response.status_code == 200
    data = response.json()
    assert "run_id" in data
    assert data["overall_scores"]["faithfulness"] == 0.95
