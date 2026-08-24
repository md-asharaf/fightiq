from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
import logging

log = logging.getLogger(__name__)

class DatabaseToolService:
    """Service to safely execute SQL queries on behalf of the AI Agent."""
    def __init__(self, db: AsyncSession):
        self.db = db

    async def execute_query(self, query: str) -> str:
        """Execute a SELECT SQL query against the structured database."""
        if not query.strip().upper().startswith("SELECT"):
            log.warning(f"Rejected non-SELECT query: {query}")
            return "Error: Only SELECT queries are permitted for safety reasons."
            
        try:
            result = await self.db.execute(text(query))
            rows = result.fetchall()
            if not rows:
                return "Query returned no results."
            
            columns = result.keys()
            output = [", ".join(columns)]
            for row in rows:
                output.append(", ".join(str(val) for val in row))
            return "\n".join(output)
        except Exception as e:
            log.error(f"Failed to execute agent SQL query: {e}")
            return f"SQL Error: {str(e)}"
