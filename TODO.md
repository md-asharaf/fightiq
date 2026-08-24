# FightIQ Future Roadmap & TODOs

## Structured SQL Data Pipeline (Text-to-SQL Agent)
**Status:** Planned for future implementation.
**Motivation:** The vector database is great for semantic search and rules, but poor at exact aggregations (e.g., "Who has the most wins in the lightweight division?"). A SQL-based tool will allow the LLM to write queries directly against structured tables.

### Implementation Steps:
1. **Schema Check:** The `Fighter` and `Event` tables already exist in `backend/app/db/models.py`.
2. **Data Ingestion Pipeline:** 
   - Build a scraper (or expand the current one) to pull exact metrics (Wins, Losses, Reach, SLpM, SApM, TDD) from sources like UFCStats.com.
   - Insert this structured data directly into the Postgres `fighters` and `events` tables instead of just vectorizing text.
3. **LangChain Tooling:**
   - Integrate `langchain_community.agent_toolkits.SQLDatabaseToolkit`.
   - Create a `query_database` tool that accepts natural language, generates a safe PostgreSQL query, executes it against the `fighters` table, and returns the structured rows.
4. **Agent Prompt Update:**
   - Re-add the rule to `AgentFactory`: *"1. STRUCTURED DATA FIRST: If the user asks for fighter records, stats, wins/losses, event dates, or math, you MUST use the `query_database` tool to run SQL."*
