#!/bin/bash

# Kill any existing server on port (default 8001) and start fresh
PORT=${PORT:-8001}
lsof -ti:$PORT | xargs kill -9 2>/dev/null
sleep 1

cd /Users/olorin/Documents/olorin/backend

echo "🚀 Starting Bayit+ Backend Server on port ${PORT}..."
poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port $PORT --log-level info 2>&1
