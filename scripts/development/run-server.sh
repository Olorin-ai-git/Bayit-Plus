#!/bin/bash

# Script to run the Olorin backend server from the correct directory
# This addresses the issue where poetry commands need to be run from olorin-server/

set -e

echo "🚀 Starting Olorin Backend Server..."

# Check if we're in the correct directory
if [ ! -d "olorin-server" ]; then
    echo "❌ Error: This script must be run from the project root directory"
    echo "   Current directory: $(pwd)"
    echo "   Expected to find: olorin-server/ subdirectory"
    exit 1
fi

# Change to the backend directory
cd olorin-server

# Check if pyproject.toml exists
if [ ! -f "pyproject.toml" ]; then
    echo "❌ Error: pyproject.toml not found in olorin-server/"
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
echo "📍 Server will be available at: http://localhost:8000"
echo "📍 API documentation: http://localhost:8000/docs"
echo "📍 Press Ctrl+C to stop the server"
echo ""

# Run the server
poetry run uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload 