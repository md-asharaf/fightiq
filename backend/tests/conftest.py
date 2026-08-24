"""
Pytest configuration and shared fixtures.

Ensures the project root .env is loaded before any test module imports
app code (which creates the Settings singleton at module level).
"""

from __future__ import annotations

from pathlib import Path

# ── Environment setup — must run before any 'app.*' import ────────────────────
# The Settings singleton is created when app.core.config is first imported.
# We pre-load the project root .env so all required vars are in os.environ.
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent  # FightIQ/
_ENV_FILE = _PROJECT_ROOT / ".env"

if _ENV_FILE.exists():
    from dotenv import load_dotenv

    load_dotenv(_ENV_FILE, override=False)  # don't override vars already set
