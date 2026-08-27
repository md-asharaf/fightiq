import logging

from arq.connections import RedisSettings

from app.core.config import settings

log = logging.getLogger("worker")

async def extract_and_ingest_task(ctx, query: str, raw_web_content: str) -> None:
    """Worker task to execute the knowledge extraction in the background."""
    from app.core.dependencies import get_fast_llm
    from app.services.knowledge_extractor import KnowledgeExtractor

    log.info(f"Worker received extraction task for query: {query}")

    # Initialize LLM inside the worker context
    llm = get_fast_llm()
    extractor = KnowledgeExtractor(llm=llm)

    try:
        await extractor.extract_and_ingest(query, raw_web_content)
        log.info(f"Worker completed extraction task for query: {query}")
    except Exception as e:
        log.error(f"Worker failed to execute extraction task: {e}")
        raise


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

    functions = [extract_and_ingest_task]
    redis_settings = RedisSettings.from_dsn(settings.redis_url)
    on_startup = startup
    on_shutdown = shutdown
