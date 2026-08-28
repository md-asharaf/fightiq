import operator
from collections.abc import Sequence
from datetime import UTC, datetime, timedelta
from typing import Annotated, Any, Literal

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langchain_core.tools import BaseTool
from langgraph.graph import END, START, StateGraph
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from typing_extensions import TypedDict

from app.services.database_tool_service import DatabaseToolService
from app.utils.embedder import Embedder
from app.utils.retriever import UFCRetriever


class GraphState(TypedDict):
    input: str
    chat_history: list[BaseMessage]
    entities: dict[str, Any]
    route: str
    evidence: Annotated[list[str], operator.add]
    citations: Annotated[list[dict], operator.add]
    output: str


class Entities(BaseModel):
    fighters: list[str] = Field(default_factory=list, description="List of fighter names mentioned")
    events: list[str] = Field(default_factory=list, description="List of UFC events mentioned")
    weight_classes: list[str] = Field(
        default_factory=list, description="List of weight classes mentioned"
    )
    scrape_topic: str | None = Field(
        default=None, description="The specific topic or URL to scrape from Wikipedia/Web if requested"
    )


class RouteDecision(BaseModel):
    route: Literal["db_search", "rag_search", "web_search", "scrape_and_ingest", "multi_source", "direct_answer"] = (
        Field(
            description="The tool route to take based on the query. db_search for stats/fights, rag_search for rules, web_search for news/rankings, scrape_and_ingest for unstructured backstories/wiki lore/explicit scrape requests, multi_source for complex, direct_answer for greetings."
        )
    )


class AgentFactory:
    """Factory for creating the FightIQ LangGraph Agent."""

    def __init__(
        self,
        db: AsyncSession,
        embedder: Embedder,
        llm: BaseChatModel,
        search_tools: Sequence[BaseTool],
        ingestion_service=None,
    ):
        self.db = db
        self.embedder = embedder
        self.llm = llm
        self.search_tools = search_tools
        self.db_service = DatabaseToolService(db)
        self.ingestion_service = ingestion_service

    def _build_retriever(self, filters: dict[str, Any] | None) -> UFCRetriever:
        category = filters.get("category") if filters else None
        fighter = filters.get("fighter") if filters else None
        return UFCRetriever(
            session=self.db,
            embedder=self.embedder,
            category=category,
            fighter=fighter,
        )

    def create_agent(self, filters: dict[str, Any] | None = None):
        retriever = self._build_retriever(filters)

        # Tools dict for easy access
        tools_by_name = {t.name: t for t in self.search_tools}

        async def analyze_query(state: GraphState):
            history_msgs = state.get("chat_history", [])

            # Extract entities
            entity_llm = self.llm.with_structured_output(Entities)
            entity_msgs = history_msgs + [HumanMessage(content=state["input"])]
            entities = await entity_llm.ainvoke(entity_msgs)

            # Determine route
            route_llm = self.llm.with_structured_output(RouteDecision)
            sys_msg = SystemMessage(
                content="""You are a routing agent for an MMA knowledge base.
Rules:
- 'db_search': historical fights, stats, records, height, reach. (e.g. "Who has a longer reach, Jon Jones or Gane?")
- 'rag_search': UFC rules, techniques, scoring criteria. (e.g. "What is an illegal knee?")
- 'web_search': upcoming fights, recent breaking news, current rankings. (e.g. "Who is fighting next week?")
- 'scrape_and_ingest': explicit "scrape" requests, fighter lore, controversies. (e.g. "Scrape Conor's backstory")
- 'multi_source': needs both DB stats and web news. (e.g. "Compare Islam's stats to the recent news about his injury")
- 'direct_answer': general greetings or out-of-scope non-MMA questions. (e.g. "Hello", "Write a python script")
If ambiguous, default to 'multi_source' to ensure no data is missed."""
            )

            route_msgs = [sys_msg] + history_msgs + [HumanMessage(content=state["input"])]
            route = await route_llm.ainvoke(route_msgs)

            # Handle type union (dict vs BaseModel) depending on LLM provider support
            entities_dict: dict[str, Any] = {}
            if hasattr(entities, "model_dump"):
                entities_dict = entities.model_dump()
            elif hasattr(entities, "dict"):
                entities_dict = entities.dict()
            elif isinstance(entities, dict):
                entities_dict = entities

            route_val = "direct_answer"
            if hasattr(route, "route"):
                route_val = route.route
            elif isinstance(route, dict):
                route_val = route.get("route", "direct_answer")

            from app.core.logging import get_logger
            log = get_logger(__name__)
            log.info("Query analysis complete", route=route_val, entities=entities_dict)

            return {"entities": entities_dict, "route": route_val}

        def route_node(state: GraphState) -> str:
            return state["route"]

        async def db_search(state: GraphState):
            # Use entities to search DB
            evidence = []
            fighters = state["entities"].get("fighters", [])
            for f in fighters:
                stats = await self.db_service.get_fighter_stats(f)
                if stats:
                    stale = False
                    if "last_updated" in stats and stats["last_updated"]:
                        # Freshness check
                        age = datetime.now(UTC) - stats["last_updated"]
                        if age > timedelta(days=7):
                            stale = True

                    evidence.append(f"DB Fighter Stats for {f} (Stale: {stale}): {stats}")

                    # Freshness fallback
                    if stale:
                        normal_search = tools_by_name.get("normal_web_search")
                        if normal_search:
                            result = await normal_search.ainvoke(
                                {"query": f"latest news on fighter {f}"}
                            )
                            evidence.append(
                                f"[Freshness Fallback] Recent web data for {f}: {result}"
                            )

            return {"evidence": evidence}

        async def rag_search(state: GraphState):
            docs = await retriever.ainvoke(state["input"])
            evidence = [d.page_content for d in docs]
            citations = [d.metadata for d in docs if hasattr(d, "metadata")]
            return {"evidence": evidence, "citations": citations}

        async def web_search(state: GraphState):
            normal_search = tools_by_name.get("normal_web_search")
            if normal_search:
                result = await normal_search.ainvoke({"query": state["input"]})
                return {"evidence": [str(result)]}
            return {"evidence": []}

        async def scrape_and_ingest(state: GraphState):
            target = state["entities"].get("scrape_topic")
            if not target:
                fighters = state["entities"].get("fighters", [])
                target = fighters[0] if fighters else state["input"]

            from app.utils.scraper import scrape_topic
            res = await scrape_topic(target)
            if res:
                content = res["content"]
                if self.ingestion_service:
                    try:
                        await self.ingestion_service.ingest_text(
                            text=content,
                            title=res["title"],
                            source=res["url"],
                            category="history",
                            source_type="scraped_agent",
                            metadata={"scraped_by": "Agentic Tool", "url": res["url"]}
                        )
                    except Exception as e:
                        import logging
                        logging.getLogger(__name__).error(f"Failed to ingest scraped data: {e}")

                # Truncate to avoid context limit issues
                evidence = f"Scraped Data for {target} from {res['url']}:\n\n{content[:4000]}"
                return {"evidence": [evidence]}

            return {"evidence": [f"I tried to scrape data for {target}, but could not find any content."]}

        async def multi_source(state: GraphState):
            db_res = await db_search(state)
            web_res = await web_search(state)
            rag_res = await rag_search(state)

            # Strict budget to avoid token limit overload
            max_evidence_length = 3000

            db_evidence = db_res.get("evidence", [])
            web_evidence = [e[:max_evidence_length] + "... (truncated)" if len(e) > max_evidence_length else e for e in web_res.get("evidence", [])]
            rag_evidence = [e[:max_evidence_length] + "... (truncated)" if len(e) > max_evidence_length else e for e in rag_res.get("evidence", [])]

            all_evidence = db_evidence + web_evidence + rag_evidence
            all_citations = rag_res.get("citations", [])
            return {"evidence": all_evidence, "citations": all_citations}

        async def generate_answer(state: GraphState):
            sys_msg = SystemMessage(
                content="""You are FightIQ, an elite, professional MMA analyst and statistician.

CRITICAL DIRECTIVES:
1. MMA FOCUS ONLY: You must ONLY answer questions related to Mixed Martial Arts (MMA), UFC, combat sports, fighters, and related news.
2. OUT OF SCOPE: If a user asks about anything else (e.g., coding, general history, math, writing a poem), you MUST politely refuse and state that you are an MMA analyst and cannot answer that.
3. NO HALLUCINATIONS: NEVER invent, guess, or hallucinate fighter statistics, records, heights, reaches, or fight outcomes. If you don't know a fact, admit it.
4. NO META-LANGUAGE: NEVER mention the words "evidence", "dataset", "context", "provided text", or explain your internal mechanics. Speak directly to the user as an expert.

Formatting rules:
- Use clean, modern Markdown.
- When comparing stats between two or more fighters, ALWAYS use a Markdown table for easy reading.
- Avoid generic AI cliches like "In conclusion" or "As an AI".
- Adopt an objective, authoritative, and deeply analytical tone."""
            )

            evidence_text = "\n\n".join(state.get("evidence", []))
            context_msg = HumanMessage(
                content=f"Evidence:\n{evidence_text}\n\nQuestion: {state['input']}"
            )

            messages = [sys_msg] + state.get("chat_history", []) + [context_msg]
            # Invoke the LLM directly so it streams back on_chat_model_stream
            response = await self.llm.ainvoke(messages, config={"tags": ["final_answer"]})
            return {"output": response.content}

        workflow = StateGraph(GraphState)

        workflow.add_node("analyze_query", analyze_query)
        workflow.add_node("db_search", db_search)
        workflow.add_node("rag_search", rag_search)
        workflow.add_node("web_search", web_search)
        workflow.add_node("scrape_and_ingest", scrape_and_ingest)
        workflow.add_node("multi_source", multi_source)
        workflow.add_node("generate_answer", generate_answer)

        workflow.add_edge(START, "analyze_query")
        workflow.add_conditional_edges(
            "analyze_query",
            route_node,
            {
                "db_search": "db_search",
                "rag_search": "rag_search",
                "web_search": "web_search",
                "scrape_and_ingest": "scrape_and_ingest",
                "multi_source": "multi_source",
                "direct_answer": "generate_answer",
            },
        )

        workflow.add_edge("db_search", "generate_answer")
        workflow.add_edge("rag_search", "generate_answer")
        workflow.add_edge("web_search", "generate_answer")
        workflow.add_edge("scrape_and_ingest", "generate_answer")
        workflow.add_edge("multi_source", "generate_answer")
        workflow.add_edge("generate_answer", END)

        return workflow.compile()
