from typing import Any

from langchain_core.documents import Document


def format_docs_for_citation(docs: list[Document]) -> str:
    """Format documents into a single string for the LLM context."""
    formatted = []
    for i, doc in enumerate(docs):
        formatted.append(f"Source [{i + 1}]:\n{doc.page_content}")
    return "\n\n".join(formatted)


def extract_citations(docs: list[Document]) -> list[dict[str, Any]]:
    """Extract metadata from retrieved documents for citation in the frontend."""
    seen_sources = set()
    citations = []

    for doc in docs:
        if not hasattr(doc, "metadata"):
            continue
        meta = doc.metadata
        title = meta.get("title", meta.get("filename", "Unknown Source"))
        if title not in seen_sources:
            seen_sources.add(title)
            citations.append(
                {
                    "title": title,
                    "category": meta.get("category", "unknown"),
                    "source": meta.get("source", ""),
                },
            )
    return citations

def extract_citations_from_string(text: str) -> list[dict[str, Any]]:
    """Extract metadata from stringified web search tool outputs."""
    seen = set()
    citations = []
    blocks = text.split("\n\n")
    for block in blocks:
        lines = block.split("\n")
        title = "Unknown Source"
        source = ""
        for line in lines:
            if line.startswith("Title: "):
                title = line[7:].strip()
            elif line.startswith("Source: "):
                source = line[8:].strip()

        if source and source not in seen:
            seen.add(source)
            citations.append({
                "title": title,
                "category": "web",
                "source": source,
            })
    return citations
