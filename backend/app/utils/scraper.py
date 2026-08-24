from __future__ import annotations

import time
from urllib.parse import quote as url_quote

import requests
from bs4 import BeautifulSoup

from app.core.logging import get_logger

log = get_logger(__name__)

_SUMMARY_API = "https://en.wikipedia.org/api/rest_v1/page/summary/{}"
_WIKI_BASE = "https://en.wikipedia.org/wiki/{}"
_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}
_REQUEST_DELAY = 1.5
_REQUEST_TIMEOUT = 15


def _url_encode(topic: str) -> str:
    """URL-encode a Wikipedia topic string (stdlib, no requests internals)."""
    return url_quote(topic.replace(" ", "_"), safe="")


def _fetch_summary(topic: str) -> dict | None:
    """Fetch the Wikipedia summary section via REST API."""
    url = _SUMMARY_API.format(_url_encode(topic))
    try:
        resp = requests.get(url, headers=_HEADERS, timeout=_REQUEST_TIMEOUT)
        resp.raise_for_status()
        return resp.json()
    except requests.HTTPError as exc:
        log.warning(
            "Wikipedia summary HTTP error",
            topic=topic,
            status=getattr(exc.response, "status_code", "unknown"),
        )
        return None
    except Exception:
        log.exception("Unexpected error fetching Wikipedia summary", topic=topic)
        return None


def _fetch_full_text(topic: str) -> str | None:
    """Fetch and extract plain-text paragraphs from a Wikipedia article page."""
    url = _WIKI_BASE.format(_url_encode(topic))
    try:
        resp = requests.get(url, headers=_HEADERS, timeout=_REQUEST_TIMEOUT)
        resp.raise_for_status()
    except requests.HTTPError as exc:
        log.warning(
            "Wikipedia page HTTP error",
            topic=topic,
            status=getattr(exc.response, "status_code", "unknown"),
        )
        return None
    except Exception:
        log.exception("Unexpected error fetching Wikipedia page", topic=topic)
        return None

    soup = BeautifulSoup(resp.text, "html.parser")

    for tag in soup.select(
        ".infobox, .navbox, .vertical-navbox, .ambox, .dmbox, "
        ".references, .reflist, .refbegin, .mw-editsection, "
        ".toc, .hatnote, .sistersitebox, .portal-bar, "
        "script, style, [class*='sidebar'], sup.reference",
    ):
        tag.decompose()

    content_div = soup.select_one("#mw-content-text .mw-parser-output")
    if not content_div:
        log.warning("Could not find content div", topic=topic)
        return None

    from markdownify import markdownify as md

    markdown_content = md(str(content_div), heading_style="ATX", tables=True, strip=["a", "img"])
    return markdown_content.strip()


def _fetch_generic_url(url: str) -> dict | None:
    """Fetch and extract text from generic URLs (ufc.com, ufcstats.com, etc)."""
    try:
        resp = requests.get(url, headers=_HEADERS, timeout=_REQUEST_TIMEOUT)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        # Try to find the main content, otherwise use body
        main_content = soup.find("main") or soup.find("article") or soup.find("body") or soup

        from markdownify import markdownify as md

        text = md(str(main_content), heading_style="ATX", tables=True, strip=["a", "img"]).strip()
        title_str = str(soup.title.string) if soup.title and soup.title.string else url

        return {
            "title": title_str.strip(),
            "content": text,
            "url": url,
        }
    except Exception as exc:
        log.error("Failed to scrape URL", url=url, error=str(exc))
        return None


def scrape_topic(topic: str) -> dict | None:
    """Scrape a Wikipedia topic or a URL and return its title, content, and URL."""
    if topic.startswith("http://") or topic.startswith("https://"):
        log.info("Scraping generic URL", url=topic)
        return _fetch_generic_url(topic)

    log.info("Scraping Wikipedia topic", topic=topic)
    summary_data = _fetch_summary(topic)
    time.sleep(_REQUEST_DELAY)

    full_text = _fetch_full_text(topic)
    time.sleep(_REQUEST_DELAY)

    if not summary_data and not full_text:
        log.warning("No content retrieved for topic", topic=topic)
        return None

    title = summary_data.get("title", topic) if summary_data else topic
    summary = summary_data.get("extract", "") if summary_data else ""
    wiki_url = f"https://en.wikipedia.org/wiki/{_url_encode(topic)}"

    content_parts: list[str] = []
    if summary:
        content_parts.append(f"# {title}\n\n{summary}")
    if full_text:
        content_parts.append(full_text)

    combined = "\n\n".join(content_parts)
    if not combined.strip():
        log.warning("Combined content is empty after processing", topic=topic)
        return None

    log.info(
        "Topic scraped successfully",
        topic=topic,
        title=title,
        content_length=len(combined),
    )
    return {
        "title": title,
        "content": combined,
        "url": wiki_url,
    }


def scrape_topics_generator(topics: list[str]):
    """Generator that yields progress for scraping multiple topics."""
    total = len(topics)
    for idx, topic in enumerate(topics):
        yield {"status": "scraping", "topic": topic, "progress": int((idx / total) * 50)}
        data = scrape_topic(topic)
        if data:
            yield {"status": "success", "topic": topic, "data": data}
        else:
            yield {"status": "error", "topic": topic, "message": "Failed to scrape"}
