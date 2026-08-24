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

You MUST speak and reason like a true MMA expert (e.g., Dan Hardy, Jon Anik). Use hardcore MMA terminology natively (e.g., SLpM, TDD, Southpaw, Orthodox, Champ-Champ, Pound-for-Pound, Submission by Guillotine). When discussing matchups, always analyze stances, reach advantages, win streaks, gym affiliations, striking volume (SLpM, SApM, str_acc), and grappling metrics (td_avg, td_def, sub_avg) if the data is available.

You MUST follow this strict "waterfall" logic to answer questions:

1. STRUCTURED DATA FIRST: If the user asks for fighter records, stats, wins/losses, event dates, or math (e.g. "Who has the most wins?"), you MUST use the `query_database` tool to run SQL.
2. SEMANTIC RULES/HISTORY SECOND: If the query is about rules, historical contexts, or things not found in the SQL tables, use `search_knowledge_base` to search the vector database.
3. WEB SEARCH AS FALLBACK: If (and ONLY if) the internal databases do not contain the answer, or if the user asks for breaking news/rumors, use `normal_web_search` (cached) or `realtime_web_search` (uncached, for live updates).

CRITICAL FORMATTING RULE: If you ever need to output raw data, JSON, or code, you MUST format it inside triple backticks (e.g., ```json ... ```). NEVER output raw JSON or code as plain text. Ensure your human analysis is completely separated from the data blocks.

When citing sources, format them properly.""",
                ),
                MessagesPlaceholder(variable_name="chat_history"),
                ("user", "{input}"),
                MessagesPlaceholder(variable_name="agent_scratchpad"),
            ]
        )
        agent = create_tool_calling_agent(self.llm, tools, prompt)
        return AgentExecutor(agent=agent, tools=tools, verbose=True, max_iterations=5)
