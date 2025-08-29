#!/bin/bash

# Script to run both Olorin frontend and backend development servers simultaneously

set -e

echo "🚀 Starting Olorin Development Environment..."

# Check if we're in the correct directory
if [ ! -d "olorin-front" ] || [ ! -d "olorin-server" ]; then
    echo "❌ Error: This script must be run from the project root directory"
    echo "   Current directory: $(pwd)"
    echo "   Expected to find: olorin-front/ and olorin-server/ subdirectories"
    exit 1
fi

# Function to cleanup background processes on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down development servers..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    wait 2>/dev/null || true
    echo "✅ Development servers stopped"
}

# Set up cleanup trap
trap cleanup EXIT INT TERM

# Start backend server in background
echo "🐍 Starting backend server..."
cd olorin-server
if [ ! -f "pyproject.toml" ]; then
    echo "❌ Error: pyproject.toml not found in olorin-server/"
    exit 1
fi

if ! command -v poetry &> /dev/null; then
    echo "❌ Error: Poetry not found. Please install Poetry first."
    echo "   Installation: curl -sSL https://install.python-poetry.org | python3 -"
    exit 1
fi

poetry install
poetry run uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload &
BACKEND_PID=$!
cd ..

# Give backend time to start
echo "⏳ Waiting for backend to initialize..."
sleep 3

# Start frontend server in background
echo "⚛️ Starting frontend server..."
cd olorin-front
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found in olorin-front/"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm not found. Please install Node.js and npm first."
    echo "   Installation: https://nodejs.org/"
    exit 1
fi

npm install
# Set port to avoid conflicts with other services
PORT=3001 npm start &
FRONTEND_PID=$!
cd ..

echo ""
echo "🎉 Olorin Development Environment is starting up!"
echo "📍 Backend API: http://localhost:8000"
echo "📍 API Documentation: http://localhost:8000/docs"
echo "📍 Frontend: http://localhost:3001"
echo ""
echo "⏳ Waiting for servers to be ready..."

# Wait for backend to be ready
for i in {1..30}; do
    if curl -f http://localhost:8000/health > /dev/null 2>&1; then
        echo "✅ Backend is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "⚠️ Backend taking longer than expected to start..."
    fi
    sleep 1
done

# Wait for frontend to be ready
for i in {1..60}; do
    if curl -f http://localhost:3001 > /dev/null 2>&1; then
        echo "✅ Frontend is ready!"
        break
    fi
    if [ $i -eq 60 ]; then
        echo "⚠️ Frontend taking longer than expected to start..."
    fi
    sleep 1
done

echo ""
echo "🎉 Development environment is ready!"
echo "📍 Frontend: http://localhost:3001"
echo "📍 Backend API: http://localhost:8000"
echo "📍 API Docs: http://localhost:8000/docs"
echo ""
echo "📝 Press Ctrl+C to stop both servers"

# Wait for user to stop the servers
wait 