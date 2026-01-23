#!/bin/bash

# Script to run the Olorin backend server from the correct directory
# This addresses the issue where poetry commands need to be run from olorin-fraud/backend/

set -e

echo "🚀 Starting Olorin Backend Server..."

# Source path utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../common/paths.sh"

# Check if backend directory exists
if [ ! -d "$FRAUD_BACKEND" ]; then
    echo "❌ Error: Backend directory not found: $FRAUD_BACKEND"
    echo "   Current directory: $(pwd)"
    exit 1
fi

# Change to the backend directory
cd "$FRAUD_BACKEND"

# Check if pyproject.toml exists
if [ ! -f "pyproject.toml" ]; then
    echo "❌ Error: pyproject.toml not found in $FRAUD_BACKEND/"
    echo "   Current directory: $(pwd)"
    exit 1
fi

# Check if poetry is installed
if ! command -v poetry &> /dev/null; then
    echo "❌ Error: Poetry not found. Please install Poetry first."
    echo "   Installation: curl -sSL https://install.python-poetry.org | python3 -"
    exit 1
fi

echo "📦 Installing/updating dependencies..."
poetry install

echo "🐍 Starting FastAPI server..."
echo "📍 Server will be available at: http://localhost:8090"
echo "📍 API documentation: http://localhost:8090/docs"
echo "📍 Press Ctrl+C to stop the server"
echo ""

# Run the server
poetry run uvicorn app.main:app --host 127.0.0.1 --port 8090 --reload 