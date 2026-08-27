import argparse
import asyncio
import logging
from datetime import UTC, datetime

import httpx
from sqlalchemy import delete, select

from app.core.config import settings
from app.db.models import Fighter, Ranking
from app.db.session import AsyncSessionLocal

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("rankings_seed")

PARSE_API_URL = "https://api.parse.bot/scraper/351d3f8b-3936-4b8b-8171-322fa6d97132/get_rankings"

async def run_rankings_etl():
    log.info("Starting UFC Rankings ETL from Parse.bot API...")

    if not settings.PARSE_API_KEY or settings.PARSE_API_KEY == "your_parse_api_key":
        log.warning("PARSE_API_KEY is not set or is default. Please add a valid key to .env. Skipping Rankings ETL.")
        return

    headers = {"X-API-Key": settings.PARSE_API_KEY}

    async with httpx.AsyncClient() as client:
        log.info("Fetching rankings from Parse.bot...")
        resp = await client.get(PARSE_API_URL, headers=headers, timeout=30.0)

        if resp.status_code != 200:
            log.error(f"Failed to fetch rankings. Status: {resp.status_code}. Response: {resp.text}")
            return

        data = resp.json()
        rankings_data = data.get("data", data) # Handle potential envelope wrappers
        if isinstance(rankings_data, dict) and "rankings" in rankings_data:
            # Maybe the top-level object has 'rankings'
            rankings_data = rankings_data["rankings"]

        if not isinstance(rankings_data, list):
            # Sometimes APIs return a single object or list. Assuming list of divisions as per docs.
            log.error(f"Unexpected API response structure: {type(rankings_data)}")
            return

    log.info(f"Downloaded rankings for {len(rankings_data)} divisions.")

    async with AsyncSessionLocal() as session:
        # Load all fighters to match IDs
        log.info("Loading fighter IDs...")
        fighter_map = {
            r.name.lower(): r.id for r in (await session.execute(select(Fighter.name, Fighter.id))).all()
        }

        # Clear existing current rankings (since we keep only the latest snapshot to avoid massive bloat)
        log.info("Clearing old rankings...")
        await session.execute(delete(Ranking).where(Ranking.promotion == "UFC"))

        insert_count = 0
        now = datetime.now(UTC)

        for division_obj in rankings_data:
            division_name = division_obj.get("division", "")
            champion_name = division_obj.get("championName", "")
            fighters_list = division_obj.get("rankings", [])

            # Insert Champion as Rank 0
            if champion_name:
                f_id = fighter_map.get(champion_name.lower().strip())
                if f_id:
                    champ_ranking = Ranking(
                        promotion="UFC",
                        division=division_name,
                        rank=0,
                        fighter_id=f_id,
                        ranking_date=now,
                        source="Parse.bot/UFC.com",
                        source_url="https://www.ufc.com/rankings"
                    )
                    session.add(champ_ranking)
                    insert_count += 1

            # Insert Contenders
            for item in fighters_list:
                rank_num = item.get("rank")
                fighter_name = item.get("fighter", "")
                f_id = fighter_map.get(fighter_name.lower().strip())

                if f_id and rank_num is not None:
                    ranking_entry = Ranking(
                        promotion="UFC",
                        division=division_name,
                        rank=int(rank_num),
                        fighter_id=f_id,
                        ranking_date=now,
                        source="Parse.bot/UFC.com",
                        source_url="https://www.ufc.com/rankings"
                    )
                    session.add(ranking_entry)
                    insert_count += 1

        log.info(f"Committing {insert_count} new ranking records...")
        await session.commit()
        log.info("✅ Rankings ETL Complete!")

def main() -> None:
    parser = argparse.ArgumentParser(description="Seed UFC rankings from Parse.bot API")
    parser.parse_args()
    asyncio.run(run_rankings_etl())

if __name__ == "__main__":
    main()
