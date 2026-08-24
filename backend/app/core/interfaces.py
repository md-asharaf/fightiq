import uuid
from collections.abc import Sequence
from typing import Protocol

from app.db.models import ChatMessage, ChatSession, Document, EvalRun, QuizResult, QuizSession


class IChatRepository(Protocol):
    async def get_session(self, session_id: uuid.UUID) -> ChatSession | None: ...

    async def create_session(
        self, session_id: uuid.UUID, user_id: str | None = None
    ) -> ChatSession: ...

    async def add_message(
        self, session_id: uuid.UUID, role: str, content: str, sources: list | None = None
    ) -> ChatMessage: ...

    async def delete_session(self, session_id: uuid.UUID) -> bool: ...

    async def list_sessions(self, user_id: str | None = None) -> Sequence[ChatSession]: ...


class IDocumentRepository(Protocol):
    async def get_document(self, document_id: uuid.UUID) -> Document | None: ...

    async def get_documents(
        self,
        category: str | None = None,
        source_type: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[Sequence[Document], int]: ...

    async def soft_delete(self, doc: Document) -> None: ...


class IEvalRepository(Protocol):
    async def create_eval_run(
        self, dataset_name: str, overall_scores: dict, question_results: list
    ) -> EvalRun: ...

    async def get_all_runs(self) -> Sequence[EvalRun]: ...


class IQuizRepository(Protocol):
    async def create_session(
        self, topic: str, category: str | None, difficulty: str, questions: list
    ) -> QuizSession: ...

    async def get_session(self, session_id: uuid.UUID) -> QuizSession | None: ...

    async def get_sessions(self, skip: int = 0, limit: int = 20) -> Sequence[QuizSession]: ...

    async def update_session(self, quiz_session: QuizSession) -> QuizSession: ...

    async def get_result(self, session_id: uuid.UUID) -> QuizResult | None: ...


class IWebSearchProvider(Protocol):
    def search(self, query: str, search_type: str, num_results: int = 3) -> str: ...
