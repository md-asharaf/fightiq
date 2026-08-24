import json
import uuid
from collections.abc import AsyncGenerator, Sequence
from typing import Any

from langchain_classic.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.tools import BaseTool, create_retriever_tool
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import attributes

from app.core.exceptions import ResourceNotFoundError
from app.core.interfaces import IChatRepository
from app.core.logging import get_logger
from app.schemas.chat import ChatHistory, ChatMessage
from app.utils.citation_extractor import extract_citations
from app.utils.embedder import Embedder
from app.utils.retriever import UFCRetriever

log = get_logger(__name__)


class ChatService:
    def __init__(
        self,
        chat_repository: IChatRepository,
        db: AsyncSession,
        embedder: Embedder,
        llm: BaseChatModel,
        search_tools: Sequence[BaseTool],
    ):
        self.repo = chat_repository
        self.db = db
        self.embedder = embedder
        self.llm = llm
        self.search_tools = search_tools

    def _build_retriever(self, filters: dict[str, Any] | None) -> UFCRetriever:
        category = filters.get("category") if filters else None
        fighter = filters.get("fighter") if filters else None
        return UFCRetriever(
            session=self.db,
            embedder=self.embedder,
            category=category,
            fighter=fighter,
        )

    def _build_agent_executor(self, filters: dict[str, Any] | None) -> AgentExecutor:
        retriever = self._build_retriever(filters)
        knowledge_base_tool = create_retriever_tool(
            retriever,
            "search_knowledge_base",
            "Searches the internal UFC knowledge base for fighters, events, history, and rules. ALWAYS use this tool FIRST before searching the web.",
        )
        tools = [knowledge_base_tool] + list(self.search_tools)

        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are FightIQ, an expert assistant for UFC and Mixed Martial Arts.
You have access to a rich internal knowledge base and the web.
ALWAYS prioritize answering from the internal knowledge base if possible.
If the information is not in the internal knowledge base or if the user asks for recent, up-to-date information, use normal_web_search.
If the query is complex and normal web search is insufficient, use deep_web_search.
When citing sources, format them properly."""),
            MessagesPlaceholder(variable_name="chat_history"),
            ("user", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ])
        agent = create_tool_calling_agent(self.llm, tools, prompt)
        return AgentExecutor(agent=agent, tools=tools, verbose=True)

    async def get_or_create_session(self, session_id_str: str):
        session_uuid = uuid.UUID(session_id_str)
        chat_session = await self.repo.get_session(session_uuid)
        if not chat_session:
            chat_session = await self.repo.create_session(session_uuid)
            await self.db.commit()
        return chat_session

    async def process_message(self, session_id_str: str, message: str, stream: bool, filters: dict | None = None):
        chat_session = await self.get_or_create_session(session_id_str)
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

        agent_executor = self._build_agent_executor(filters)
        result = await agent_executor.ainvoke(
            {
                "input": message,
                "chat_history": history,
            },
        )

        sources: list[Any] = []
        if "intermediate_steps" in result:
            for action, observation in result["intermediate_steps"]:
                if action.tool == "search_knowledge_base" and isinstance(observation, list):
                    sources.extend(extract_citations(observation))

        await self.repo.add_message(
            chat_session.id, "assistant", result["output"], sources
        )
        await self.db.commit()

        return ChatMessage(
            role="assistant",
            content=result["output"],
            sources=sources,
        )

    async def _stream_response(self, session_id: uuid.UUID, message: str, history: list[BaseMessage], filters: dict | None) -> AsyncGenerator[str, None]:
        full_response = ""
        sources: list[Any] = []
        agent_executor = self._build_agent_executor(filters)

        async for event in agent_executor.astream_events(
            {"input": message, "chat_history": history}, version="v2",
        ):
            kind = event["event"]
            if kind == "on_tool_end" and event["name"] == "search_knowledge_base":
                docs = event["data"].get("output", [])
                if isinstance(docs, list):
                    citations = extract_citations(docs)
                    payload = json.dumps({"type": "sources", "sources": citations})
                    yield f"data: {payload}\n\n"
            elif kind == "on_chat_model_stream":
                chunk_content = event["data"]["chunk"].content
                if isinstance(chunk_content, list):
                    chunk_str = "".join(block.get("text", "") for block in chunk_content if block.get("type") == "text")
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

    async def get_history(self, session_id_str: str) -> ChatHistory:
        session_uuid = uuid.UUID(session_id_str)
        chat_session = await self.repo.get_session(session_uuid)
        if not chat_session:
            raise ResourceNotFoundError(f"Chat session '{session_id_str}' not found")
        sorted_messages = sorted(chat_session.messages, key=lambda x: x.created_at)
        messages = [
            ChatMessage(role=m.role, content=m.content, sources=m.sources)
            for m in sorted_messages
        ]
        return ChatHistory(session_id=session_id_str, messages=messages)

    async def delete_history(self, session_id_str: str) -> bool:
        session_uuid = uuid.UUID(session_id_str)
        success = await self.repo.delete_session(session_uuid)
        if not success:
            raise ResourceNotFoundError(f"Chat session '{session_id_str}' not found")
        await self.db.commit()
        return success
