import logging

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Event, Fight, Fighter

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
            await self.db.rollback()
            return f"SQL Error: {str(e)}"
        finally:
            await self.db.commit()

    async def _build_fighter_match_condition(self, name: str):
        from sqlalchemy import or_
        words = [w for w in name.split() if len(w) > 2]
        if not words:
            return Fighter.name.ilike(f"%{name}%")

        conditions = []
        for word in words:
            conditions.append(Fighter.name.ilike(f"%{word}%"))
            conditions.append(Fighter.nickname.ilike(f"%{word}%"))
            conditions.append(Fighter.first_name.ilike(f"%{word}%"))
            conditions.append(Fighter.last_name.ilike(f"%{word}%"))

        return or_(*conditions)

    async def get_fighter_stats(self, name: str) -> dict | None:
        """Fetch stats for a specific fighter using robust fuzzy-like matching."""
        condition = await self._build_fighter_match_condition(name)
        stmt = select(Fighter).where(condition).limit(1)
        result = await self.db.execute(stmt)
        fighter = result.scalar_one_or_none()
        if fighter:
            return {
                "name": fighter.name,
                "record": f"{fighter.wins}-{fighter.losses}-{fighter.draws}",
                "ko_wins": fighter.ko_wins,
                "submission_wins": fighter.submission_wins,
                "height_cm": fighter.height_cm,
                "reach_cm": fighter.reach_cm,
                "weight_class": fighter.weight_class,
                "is_champion": fighter.is_champion,
                "stance": fighter.stance,
                "striking_slpm": fighter.slpm,
                "striking_sapm": fighter.sapm,
                "takedown_avg": fighter.td_avg,
                "last_updated": fighter.last_updated,
            }
        return None

    async def get_fight_history(self, fighter_name: str, limit: int = 5) -> list[dict]:
        """Fetch recent fights for a given fighter using robust matching."""
        condition = await self._build_fighter_match_condition(fighter_name)
        stmt = (
            select(Fight, Event)
            .join(Event, Fight.event_id == Event.id)
            .join(Fighter, (Fight.fighter_a_id == Fighter.id) | (Fight.fighter_b_id == Fighter.id))
            .where(condition)
            .order_by(Event.date.desc().nulls_last())
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        history = []
        for fight, event in result:
            history.append(
                {
                    "event": event.name,
                    "date": str(event.date)[:10] if event.date else None,
                    "weight_class": fight.weight_class,
                    "result": fight.result,
                    "method": fight.method,
                    "round": fight.round,
                    "time": fight.time,
                }
            )
        return history
