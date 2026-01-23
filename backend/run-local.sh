#!/bin/bash
# Local Backend Development Server
# Kills any existing process on port (default 8000) and starts the server with hot reload

set -e  # Exit on error

echo "🚀 Starting Bayit+ Backend Server (Local Development)"
echo "=================================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if port is in use (default 8000 for local dev)
PORT=${PORT:-8000}
echo -e "\n${YELLOW}Checking port ${PORT}...${NC}"

# Find process using port
PID=$(lsof -ti:$PORT 2>/dev/null || true)

if [ -n "$PID" ]; then
    echo -e "${YELLOW}Found process $PID using port ${PORT}${NC}"
    echo -e "${RED}Killing process $PID...${NC}"
    kill -9 $PID 2>/dev/null || true
    sleep 1
    echo -e "${GREEN}✓ Port ${PORT} is now free${NC}"
else
    echo -e "${GREEN}✓ Port ${PORT} is available${NC}"
fi

# Check if we're in the backend directory
if [ ! -f "pyproject.toml" ]; then
    echo -e "${RED}Error: pyproject.toml not found. Please run this script from the backend directory.${NC}"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Warning: .env file not found. Make sure environment variables are set.${NC}"
fi

# Check if Poetry is installed
if ! command -v poetry &> /dev/null; then
    echo -e "${RED}Error: Poetry is not installed. Please install Poetry first.${NC}"
    echo "Visit: https://python-poetry.org/docs/#installation"
    exit 1
fi

# Install dependencies if needed
echo -e "\n${YELLOW}Checking dependencies...${NC}"
poetry install --no-interaction

# Start the server with hot reload
echo -e "\n${GREEN}Starting server on http://0.0.0.0:${PORT}${NC}"
echo -e "${GREEN}Hot reload enabled - code changes will automatically restart the server${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
echo "=================================================="
echo ""

# Run the server with uvicorn
poetry run uvicorn app.main:app \
    --reload \
    --host 0.0.0.0 \
    --port $PORT \
    --log-level info

# Note: The server will run until manually stopped with Ctrl+C
