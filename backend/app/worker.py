"""
ARQ Worker
==========
Background job worker for FightIQ.

Tasks:
- extract_and_ingest_task: (DISABLED - kept for backwards compat) LLM knowledge extraction
- refresh_fighters_task:   Weekly ETL to refresh fighter stats from UFCStats GitHub CSVs

Run the worker:
    uv run arq app.worker.WorkerSettings
"""

import logging

from arq.connections import RedisSettings
from arq.cron import cron

from app.core.config import settings

log = logging.getLogger("worker")


# ── Weekly ETL ───────────────────────────────────────────────────────────────

async def refresh_fighters_task(ctx) -> None:
    """
    Weekly task: Pull latest UFC fighter data from GitHub CSVs and upsert into DB.
    Runs every Monday at 03:00 UTC to catch weekend fight results.
    """
    log.info("Starting weekly fighter data refresh...")
    try:
        from app.scripts.seed_ufcstats import run_etl
        await run_etl(force=True)
        log.info("Weekly fighter data refresh completed successfully.")
    except Exception as e:
        log.error(f"Weekly fighter data refresh failed: {e}")
        raise


async def seed_rankings_task(ctx) -> None:
    """
    Weekly task: Fetch latest UFC rankings from Parse.bot and upsert into DB.
    Runs every Wednesday at 04:00 UTC (captures Tuesday rankings updates).
    """
    log.info("Starting weekly rankings refresh...")
    try:
        from app.scripts.seed_rankings import run_rankings_etl
        await run_rankings_etl()
        log.info("Weekly rankings refresh completed successfully.")
    except Exception as e:
        log.error(f"Weekly rankings refresh failed: {e}")
        raise

# ── Lifecycle ────────────────────────────────────────────────────────────────

async def startup(ctx):
    """Run on worker startup."""
    log.info("ARQ Worker starting up...")


async def shutdown(ctx):
    """Run on worker shutdown."""
    log.info("ARQ Worker shutting down...")
    from app.db.session import engine
    await engine.dispose()


class WorkerSettings:
    """Settings for the ARQ worker process."""

    functions = [refresh_fighters_task, seed_rankings_task]

    cron_jobs = [
        cron(refresh_fighters_task, weekday=0, hour=3, minute=0),
        cron(seed_rankings_task, weekday=2, hour=4, minute=0),
    ]

    redis_settings = RedisSettings.from_dsn(settings.redis_url)
    on_startup = startup
    on_shutdown = shutdown
