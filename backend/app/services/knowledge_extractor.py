import datetime
import logging
from typing import cast

from langchain_core.language_models import BaseChatModel
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.knowledge_graph_repository import KnowledgeGraphRepository

log = logging.getLogger(__name__)


class FighterExtraction(BaseModel):
    name: str = Field(description="The full name of the fighter")
    nickname: str | None = Field(default=None, description="The fighter's nickname")
    weight_class: str | None = Field(default=None, description="The weight class they fight in")
    wins: int | None = Field(default=None, description="Total wins")
    losses: int | None = Field(default=None, description="Total losses")
    draws: int | None = Field(default=None, description="Total draws")
    is_champion: bool = Field(default=False, description="Whether they are currently a champion")
    title_defenses: int | None = Field(
        default=None, description="Number of successful title defenses"
    )
    championships: list[str] | None = Field(
        default=None, description="List of weight classes they have been champion in"
    )
    win_streak: int | None = Field(
        default=None, description="Current win streak, 0 if coming off a loss"
    )
    team: str | None = Field(default=None, description="Current gym or team affiliation")
    stance: str | None = Field(default=None, description="Orthodox, Southpaw, or Switch")
    height_cm: float | None = Field(default=None, description="Height in centimeters")
    reach_cm: float | None = Field(default=None, description="Reach in centimeters")
    slpm: float | None = Field(default=None, description="Significant Strikes Landed per Minute")
    str_acc: float | None = Field(
        default=None, description="Significant Striking Accuracy percentage (e.g. 50.5)"
    )
    sapm: float | None = Field(default=None, description="Significant Strikes Absorbed per Minute")
    str_def: float | None = Field(
        default=None, description="Significant Striking Defense percentage"
    )
    td_avg: float | None = Field(
        default=None, description="Average Takedowns Landed per 15 minutes"
    )
    td_acc: float | None = Field(default=None, description="Takedown Accuracy percentage")
    td_def: float | None = Field(default=None, description="Takedown Defense percentage")
    sub_avg: float | None = Field(default=None, description="Submission Average per 15 minutes")


class EventExtraction(BaseModel):
    name: str = Field(description="The name of the event (e.g., UFC 300)")
    date: str | None = Field(default=None, description="The date of the event in YYYY-MM-DD format")
    location: str | None = Field(default=None, description="The location of the event")


class KnowledgeExtractionResult(BaseModel):
    fighters: list[FighterExtraction] = Field(
        default_factory=list, description="Fighters extracted from the text"
    )
    events: list[EventExtraction] = Field(
        default_factory=list, description="Events extracted from the text"
    )


class KnowledgeExtractor:
    """Extracts structured knowledge from web search results and upserts to SQL."""

    def __init__(
        self,
        repo: KnowledgeGraphRepository,
        llm: BaseChatModel,
        db: AsyncSession,
    ):
        self.repo = repo
        self.llm = llm
        self.db = db

    async def extract_and_ingest(self, query: str, raw_web_content: str) -> None:
        """Runs the extraction in the background and upserts into PostgreSQL."""
        try:
            log.info(f"Starting background extraction for query: {query}")

            # 1. Structure the LLM
            structured_llm = self.llm.with_structured_output(KnowledgeExtractionResult)

            prompt = (
                f"Extract structured facts about UFC/MMA fighters and events from the following text.\n"
                f"Query that generated this text: {query}\n\n"
                f"TEXT:\n{raw_web_content}\n\n"
                "CRITICAL INSTRUCTIONS:\n"
                "1. ONLY extract the PRIMARY subjects (fighters/events) that the text is actually about.\n"
                "2. DO NOT extract every single opponent listed in fight history tables or passing mentions.\n"
                "3. If there are no concrete, objective facts about the main subjects, return empty lists.\n"
                "4. Do not extract opinions or unverified rumors."
            )

            result = cast(KnowledgeExtractionResult, await structured_llm.ainvoke(prompt))

            # 2. Upsert Fighters
            if result.fighters:
                for fighter in result.fighters:
                    await self.repo.upsert_fighter(fighter.model_dump())

            # 3. Upsert Events
            if result.events:
                for event in result.events:
                    data = event.model_dump()
                    if data.get("date"):
                        try:
                            data["date"] = datetime.datetime.strptime(
                                data["date"], "%Y-%m-%d"
                            ).replace(tzinfo=datetime.UTC)
                        except ValueError:
                            data["date"] = None
                    await self.repo.upsert_event(data)

            if result.fighters or result.events:
                await self.db.commit()
                log.info(
                    f"Successfully upserted {len(result.fighters)} fighters and {len(result.events)} events."
                )
            else:
                log.info("No facts extracted.")

        except Exception as e:
            log.error(f"Error in background knowledge extraction: {e}")
            await self.db.rollback()
