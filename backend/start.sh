#!/bin/bash

# Kill any existing server on port 8000 and start fresh
lsof -ti:8000 | xargs kill -9 2>/dev/null
sleep 1

cd /Users/olorin/Documents/olorin/backend

echo "🚀 Starting Bayit+ Backend Server..."
poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --log-level info 2>&1
