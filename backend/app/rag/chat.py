import json
from collections.abc import AsyncGenerator

from langchain_classic.chains.combine_documents import create_stuff_documents_chain
from langchain_classic.chains.history_aware_retriever import create_history_aware_retriever
from langchain_classic.chains.retrieval import create_retrieval_chain
from langchain_core.messages import BaseMessage
from langchain_core.runnables import Runnable
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import SecretStr
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.ingestion.embedder import Embedder
from app.rag.citation import extract_citations
from app.rag.prompt_templates import CONTEXTUALIZE_Q_PROMPT, QA_PROMPT
from app.rag.retriever import UFCRetriever


def _get_llm(stream: bool = False) -> ChatGoogleGenerativeAI:
    """Initialize the Gemini chat model."""
    return ChatGoogleGenerativeAI(
        model=settings.llm_model,
        google_api_key=SecretStr(settings.google_api_key),
        temperature=0.3,
        max_output_tokens=1024,
        streaming=stream,
    )


def create_conversational_rag_chain(
    retriever: Runnable, stream: bool = False,
) -> Runnable:
    """Create an LCEL chain for conversational RAG."""
    llm = _get_llm(stream=stream)

    history_aware_retriever = create_history_aware_retriever(
        llm, retriever, CONTEXTUALIZE_Q_PROMPT,
    )

    qa_chain = create_stuff_documents_chain(
        llm,
        QA_PROMPT,
        document_prompt=None,
        document_variable_name="context",
    )

    return create_retrieval_chain(history_aware_retriever, qa_chain)


def _build_retriever(
    session: AsyncSession, embedder: Embedder, filters: dict | None,
) -> UFCRetriever:
    category = filters.get("category") if filters else None
    fighter = filters.get("fighter") if filters else None
    return UFCRetriever(
        session=session,
        embedder=embedder,
        category=category,
        fighter=fighter,
    )


async def generate_chat_response(
    message: str,
    history: list[BaseMessage],
    session: AsyncSession,
    embedder: Embedder,
    filters: dict | None = None,
) -> dict:
    """Generate a single response (non-streaming)."""
    retriever = _build_retriever(session, embedder, filters)

    llm = _get_llm(stream=False)
    history_aware = create_history_aware_retriever(llm, retriever, CONTEXTUALIZE_Q_PROMPT)
    qa = create_stuff_documents_chain(llm, QA_PROMPT)
    chain = create_retrieval_chain(history_aware, qa)

    result = await chain.ainvoke(
        {
            "input": message,
            "chat_history": history,
        },
    )

    docs = result.get("context", [])
    citations = extract_citations(docs)

    return {
        "answer": result["answer"],
        "sources": citations,
    }


async def stream_chat_response(
    message: str,
    history: list[BaseMessage],
    session: AsyncSession,
    embedder: Embedder,
    filters: dict | None = None,
) -> AsyncGenerator[str, None]:
    """Stream a RAG response, yielding JSON strings for SSE."""
    retriever = _build_retriever(session, embedder, filters)

    llm = _get_llm(stream=True)
    history_aware = create_history_aware_retriever(llm, retriever, CONTEXTUALIZE_Q_PROMPT)
    qa = create_stuff_documents_chain(llm, QA_PROMPT)
    chain = create_retrieval_chain(history_aware, qa)

    async for event in chain.astream_events(
        {"input": message, "chat_history": history}, version="v1",
    ):
        kind = event["event"]
        if kind == "on_retriever_end":
            docs: list = event["data"].get("output", [])
            citations = extract_citations(docs)
            yield json.dumps({"type": "sources", "data": citations}) + "\n"

        elif kind == "on_chat_model_stream":
            chunk = event["data"]["chunk"].content
            if chunk:
                yield json.dumps({"type": "chunk", "data": chunk}) + "\n"

        elif kind == "on_chain_end" and event["name"] == "combine_documents_chain":
            yield json.dumps({"type": "done"}) + "\n"
