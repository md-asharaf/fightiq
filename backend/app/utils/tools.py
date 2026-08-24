from langchain_exa import ExaSearchRetriever


class ExaSearchProvider:
    """Concrete implementation of IWebSearchProvider using Exa."""

    def __init__(self, api_key: str):
        self.api_key = api_key

    def search(self, query: str, search_type: str, num_results: int = 3) -> str:
        """Search the web using Exa."""
        if not self.api_key:
            return "Search API key not configured. Web search is unavailable."

        retriever = ExaSearchRetriever(
            exa_api_key=self.api_key,
            type=search_type, # 'neural' or 'keyword'
            use_autoprompt=True,
            num_results=num_results,
        )
        docs = retriever.invoke(query)
        return "\n\n".join(f"Title: {d.metadata.get('title')}\nSource: {d.metadata.get('url')}\nContent: {d.page_content}" for d in docs)
