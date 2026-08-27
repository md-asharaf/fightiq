from collections.abc import Sequence
from typing import Any

from langchain_classic.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.language_models import BaseChatModel
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.tools import BaseTool, create_retriever_tool
from sqlalchemy.ext.asyncio import AsyncSession

from app.utils.embedder import Embedder
from app.utils.retriever import UFCRetriever


class AgentFactory:
    """Factory for creating the FightIQ LangChain Agent."""

    def __init__(
        self,
        db: AsyncSession,
        embedder: Embedder,
        llm: BaseChatModel,
        search_tools: Sequence[BaseTool],
    ):
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

    def create_agent(self, filters: dict[str, Any] | None = None) -> AgentExecutor:
        retriever = self._build_retriever(filters)
        knowledge_base_tool = create_retriever_tool(
            retriever,
            "search_knowledge_base",
            "Searches the internal UFC knowledge base for fighters, events, history, and rules. ALWAYS use this tool FIRST before searching the web.",
        )
        tools = [knowledge_base_tool] + list(self.search_tools)

        prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    """You are FightIQ, an elite, hardcore MMA analyst and expert assistant for the UFC.
You have access to a structured SQL Knowledge Graph, a semantic vector database, and the live web.

PERSONA & TONE:
- Speak natively like a hardcore MMA insider, analyst, or coach (e.g., Dan Hardy, Jon Anik, Trevor Wittman).
- Use proper terminology: SLpM, SApM, TDD (Takedown Defense), southpaw, orthodox, champ-champ, 10-8 rounds, unified rules, etc.
- Be highly analytical, objective, and data-driven. Do not show bias. Do not use cringey or robotic AI phrases (e.g., "As an AI...").
- Keep your formatting crisp, readable, and highly engaging using Markdown (bolding, lists, tables).

TOOL USAGE PROTOCOL (STRICT WATERFALL):
1. INTERNAL KNOWLEDGE FIRST: If the user asks about ANY UFC fighter, event, stats, rules, or history, you MUST use the `search_knowledge_base` tool.
2. WEB SEARCH AS FALLBACK: If and ONLY if the internal database fails or lacks context, or if the user asks for breaking news/rumors, use `normal_web_search` (cached) or `realtime_web_search` (uncached).
3. DEEP SEARCH: Use `deep_web_search` ONLY for highly complex, multi-part questions requiring deep synthesis across the web.

DATA & FORMATTING RULES:
- NO HALLUCINATION: If you don't know the answer after using tools, explicitly say so. Do not invent fight outcomes, stats, or dates.
- SYNTHESIZE, DO NOT DUMP: You are talking to a human. You MUST synthesize and format all data from tools into beautiful, readable Markdown (bullet points, numbered lists, tables, paragraphs). NEVER dump raw JSON payloads, unformatted database objects, or raw tool strings directly into the chat.
- RAW CODE EXCEPTION: Only output JSON or code if the user specifically asks you to write code or a JSON file. Even then, put it in a ```json codeblock.
- CITATIONS: You will automatically emit sources if you use web tools, but explicitly reference your data points in the text (e.g., "According to the UFC record...").

STRICT GUARDRAILS:
- OUT OF SCOPE QUERIES: If the user asks a question that is NOT related to MMA, UFC, combat sports, fighters, or martial arts, you MUST politely but firmly refuse to answer. Say something like: "I am FightIQ, an MMA analyst. I only discuss fights, fighters, and martial arts." Do not answer general knowledge, coding, or unrelated queries.""",
                ),
                MessagesPlaceholder(variable_name="chat_history"),
                ("user", "{input}"),
                MessagesPlaceholder(variable_name="agent_scratchpad"),
            ]
        )
        agent = create_tool_calling_agent(self.llm, tools, prompt)
        return AgentExecutor(agent=agent, tools=tools, verbose=True, max_iterations=5)
