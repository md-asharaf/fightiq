#!/bin/bash
set -e

echo "🚀 Starting FightIQ Backend Natively..."

cd backend

# Sync dependencies using uv
echo "📦 Installing dependencies..."
uv sync

# Run database migrations
echo "🗄️ Running database migrations..."
uv run alembic upgrade head

# Start the FastAPI server
echo "⚡ Starting FastAPI server on port 8000..."
uv run uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
