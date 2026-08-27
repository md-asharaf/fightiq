import json
import uuid
from collections.abc import AsyncGenerator
from typing import Any

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import attributes

from app.core.exceptions import ResourceNotFoundError
from app.core.interfaces import IChatRepository
from app.core.logging import get_logger
from app.schemas.chat import ChatHistory, ChatMessage
from app.services.agent_factory import AgentFactory
from app.utils.citation_extractor import extract_citations

log = get_logger(__name__)


class ChatService:
    def __init__(
        self,
        chat_repository: IChatRepository,
        agent_factory: AgentFactory,
        db: AsyncSession,
    ):
        self.repo = chat_repository
        self.agent_factory = agent_factory
        self.db = db

    async def get_or_create_session(self, session_id_str: str, user_id: str | None = None):
        session_uuid = uuid.UUID(session_id_str)
        chat_session = await self.repo.get_session(session_uuid)
        if not chat_session:
            chat_session = await self.repo.create_session(session_uuid, user_id)
            await self.db.commit()
        else:
            if chat_session.user_id and chat_session.user_id != user_id:
                raise ResourceNotFoundError(f"Chat session '{session_id_str}' not found")
        return chat_session

    async def process_message(
        self,
        session_id_str: str,
        message: str,
        stream: bool,
        user_id: str | None = None,
        filters: dict | None = None,
    ):
        chat_session = await self.get_or_create_session(session_id_str, user_id)
        history: list[BaseMessage] = []

        state = attributes.instance_state(chat_session)
        if "messages" in state.dict:
            for m in chat_session.messages:
                if m.role == "user":
                    history.append(HumanMessage(content=m.content))
                elif m.role == "assistant":
                    history.append(AIMessage(content=m.content))

        await self.repo.add_message(chat_session.id, "user", message)
        await self.db.commit()

        if stream:
            return self._stream_response(chat_session.id, message, history, filters)

        agent_executor = self.agent_factory.create_agent(filters)
        result = await agent_executor.ainvoke(
            {
                "input": message,
                "chat_history": history,
            },
        )

        sources: list[Any] = []

        # In LangGraph, citations are stored in the state
        if "citations" in result and result["citations"]:
            for citation in result["citations"]:
                if isinstance(citation, dict) or hasattr(citation, "url"):
                    sources.append(citation)
                elif isinstance(citation, str):
                    from app.utils.citation_extractor import extract_citations_from_string

                    sources.extend(extract_citations_from_string(citation))

        await self.repo.add_message(chat_session.id, "assistant", result["output"], sources)
        await self.db.commit()

        return ChatMessage(
            role="assistant",
            content=result["output"],
            sources=sources,
        )

    async def _stream_response(
        self, session_id: uuid.UUID, message: str, history: list[BaseMessage], filters: dict | None
    ) -> AsyncGenerator[str, None]:
        import asyncio

        full_response = ""
        sources: list[Any] = []
        agent_executor = self.agent_factory.create_agent(filters)

        try:
            search_tools = {"normal_web_search", "realtime_web_search", "deep_web_search"}
            async for event in agent_executor.astream_events(
                {"input": message, "chat_history": history},
                version="v2",
            ):
                kind = event["event"]
                if kind == "on_tool_end" and event["name"] in search_tools:
                    docs: Any = event["data"].get("output")
                    if isinstance(docs, str):
                        from app.utils.citation_extractor import extract_citations_from_string

                        citations = extract_citations_from_string(docs)
                        sources.extend(citations)
                        payload = json.dumps({"type": "sources", "sources": citations})
                        yield f"data: {payload}\n\n"
                    elif isinstance(docs, list):
                        citations = extract_citations(docs)
                        sources.extend(citations)
                        payload = json.dumps({"type": "sources", "sources": citations})
                        yield f"data: {payload}\n\n"
                elif kind == "on_retriever_end":
                    retriever_docs: Any = event["data"].get("output", [])
                    if isinstance(retriever_docs, list):
                        citations = extract_citations(retriever_docs)
                        sources.extend(citations)
                        payload = json.dumps({"type": "sources", "sources": citations})
                        yield f"data: {payload}\n\n"
                elif kind == "on_chat_model_stream":
                    chunk_content = event["data"]["chunk"].content
                    if isinstance(chunk_content, list):
                        chunk_str = "".join(
                            block.get("text", "")
                            for block in chunk_content
                            if block.get("type") == "text"
                        )
                    else:
                        chunk_str = str(chunk_content)
                    if chunk_str:
                        payload = json.dumps({"type": "chunk", "content": chunk_str})
                        yield f"data: {payload}\n\n"
                        full_response += chunk_str
                elif kind == "on_chain_end" and event["name"] == "AgentExecutor":
                    payload = json.dumps({"type": "done"})
                    yield f"data: {payload}\n\n"

            await self.repo.add_message(session_id, "assistant", full_response, sources)
            await self.db.commit()

        except asyncio.CancelledError:
            log.warning("Stream cancelled by client. Saving partial response.")
            if full_response:
                await self.repo.add_message(session_id, "assistant", full_response, sources)
                await self.db.commit()
            raise
        except Exception as e:
            log.error(f"Error during streaming response: {e}", exc_info=True)
            error_msg = "\n\n**Error**: An unexpected error occurred while generating the response. Please try again."
            payload = json.dumps({"type": "chunk", "content": error_msg})
            yield f"data: {payload}\n\n"

            full_response += error_msg
            await self.repo.add_message(session_id, "assistant", full_response, sources)
            await self.db.commit()

    async def get_history(self, session_id_str: str, user_id: str | None = None) -> ChatHistory:
        session_uuid = uuid.UUID(session_id_str)
        chat_session = await self.repo.get_session(session_uuid)
        if not chat_session:
            raise ResourceNotFoundError(f"Chat session '{session_id_str}' not found")
        if chat_session.user_id and chat_session.user_id != user_id:
            raise ResourceNotFoundError(f"Chat session '{session_id_str}' not found")

        sorted_messages = sorted(chat_session.messages, key=lambda x: x.created_at)
        messages = [
            ChatMessage(role=m.role, content=m.content, sources=m.sources) for m in sorted_messages
        ]
        return ChatHistory(session_id=session_id_str, messages=messages)

    async def list_sessions(self, user_id: str | None = None) -> list[Any]:
        from app.schemas.chat import ChatSessionPreview

        sessions = await self.repo.list_sessions(user_id=user_id)
        previews = []
        for s in sessions:
            preview_text = "New Chat"
            for m in s.messages:
                if m.role == "user":
                    preview_text = m.content[:50] + ("..." if len(m.content) > 50 else "")
                    break
            previews.append(
                ChatSessionPreview(
                    session_id=str(s.id), created_at=s.created_at, preview_text=preview_text
                )
            )
        return previews

    async def delete_history(self, session_id_str: str, user_id: str | None = None) -> bool:
        session_uuid = uuid.UUID(session_id_str)
        chat_session = await self.repo.get_session(session_uuid)
        if not chat_session:
            raise ResourceNotFoundError(f"Chat session '{session_id_str}' not found")
        if chat_session.user_id and chat_session.user_id != user_id:
            raise ResourceNotFoundError(f"Chat session '{session_id_str}' not found")

        success = await self.repo.delete_session(session_uuid)
        if success:
            await self.db.commit()
        return success
