import pytest
import uuid
from typing import Sequence, Any
from unittest.mock import AsyncMock

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import BaseMessage

from app.core.interfaces import IChatRepository
from app.db.models import ChatSession, ChatMessage
from app.services.chat_service import ChatService
from app.core.exceptions import ResourceNotFoundError
from app.utils.embedder import Embedder

class InMemoryChatRepository(IChatRepository):
    def __init__(self):
        self.sessions: dict[uuid.UUID, ChatSession] = {}

    async def get_session(self, session_id: uuid.UUID) -> ChatSession | None:
        return self.sessions.get(session_id)

    async def create_session(self, session_id: uuid.UUID) -> ChatSession:
        session = ChatSession(id=session_id)
        session.messages = []
        self.sessions[session_id] = session
        return session

    async def add_message(
        self, session_id: uuid.UUID, role: str, content: str, sources: list | None = None
    ) -> ChatMessage:
        msg = ChatMessage(session_id=session_id, role=role, content=content, sources=sources)
        if session_id in self.sessions:
            if not hasattr(self.sessions[session_id], "messages"):
                self.sessions[session_id].messages = []
            self.sessions[session_id].messages.append(msg)
        return msg

    async def delete_session(self, session_id: uuid.UUID) -> bool:
        if session_id in self.sessions:
            del self.sessions[session_id]
            return True
        return False

class FakeChatModel(BaseChatModel):
    def _generate(self, messages, stop, run_manager, **kwargs):
        raise NotImplementedError()
    
    @property
    def _llm_type(self) -> str:
        return "fake"

@pytest.fixture
def chat_service():
    repo = InMemoryChatRepository()
    db = AsyncMock() # Fake UnitOfWork manager
    embedder = AsyncMock(spec=Embedder)
    llm = FakeChatModel()
    
    return ChatService(
        chat_repository=repo,
        db=db,
        embedder=embedder,
        llm=llm,
        search_tools=[]
    )


@pytest.mark.asyncio
async def test_get_history_not_found(chat_service: ChatService):
    """Test that the service throws our custom DomainError when session is missing."""
    with pytest.raises(ResourceNotFoundError) as exc_info:
        await chat_service.get_history(str(uuid.uuid4()))
    assert "not found" in str(exc_info.value)


@pytest.mark.asyncio
async def test_delete_history_not_found(chat_service: ChatService):
    """Test that delete_history throws our custom DomainError when session is missing."""
    with pytest.raises(ResourceNotFoundError) as exc_info:
        await chat_service.delete_history(str(uuid.uuid4()))
    assert "not found" in str(exc_info.value)


@pytest.mark.asyncio
async def test_get_history_success(chat_service: ChatService):
    """Test retrieving history for an existing session."""
    session_id = uuid.uuid4()
    await chat_service.repo.create_session(session_id)
    
    history = await chat_service.get_history(str(session_id))
    assert history.session_id == str(session_id)
    assert len(history.messages) == 0


@pytest.mark.asyncio
async def test_delete_history_success(chat_service: ChatService):
    """Test deleting an existing session and ensuring db.commit() is called."""
    session_id = uuid.uuid4()
    await chat_service.repo.create_session(session_id)
    
    # Pre-condition: session exists
    assert await chat_service.repo.get_session(session_id) is not None
    
    # Action
    success = await chat_service.delete_history(str(session_id))
    assert success is True
    
    # Post-condition: session is gone
    assert await chat_service.repo.get_session(session_id) is None
    
    # Verify UnitOfWork pattern (db.commit was called)
    chat_service.db.commit.assert_awaited_once()
