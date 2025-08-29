#!/bin/bash

# Script to run the Olorin frontend development server from the correct directory

set -e

echo "🚀 Starting Olorin Frontend Development Server..."

# Check if we're in the correct directory
if [ ! -d "olorin-front" ]; then
    echo "❌ Error: This script must be run from the project root directory"
    echo "   Current directory: $(pwd)"
    echo "   Expected to find: olorin-front/ subdirectory"
    exit 1
fi

# Change to the frontend directory
cd olorin-front

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found in olorin-front/"
    echo "   Current directory: $(pwd)"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm not found. Please install Node.js and npm first."
    echo "   Installation: https://nodejs.org/"
    exit 1
fi

echo "📦 Installing/updating dependencies..."
npm install

echo "⚛️ Starting React development server..."
echo "📍 Frontend will be available at: http://localhost:3000"
echo "📍 Press Ctrl+C to stop the server"
echo ""

# Run the development server
npm start 