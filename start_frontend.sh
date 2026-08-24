#!/bin/bash
set -e

echo "🚀 Starting FightIQ Frontend Natively..."

cd frontend

# Install dependencies
echo "📦 Installing npm dependencies..."
npm install

# Start the Next.js dev server
echo "⚡ Starting Next.js development server on port 3000..."
npm run dev
