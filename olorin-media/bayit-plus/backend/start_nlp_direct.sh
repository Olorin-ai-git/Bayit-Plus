#!/bin/bash
# Start Bayit+ Backend with NLP Features - Direct Environment Variables

set -e

# Change to backend directory
cd "$(dirname "$0")"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Bayit+ Backend - Starting with NLP Features (Direct Mode)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Export NLP configuration directly
export OLORIN_NLP_ENABLED=true
export OLORIN_NLP_CONFIDENCE_THRESHOLD=0.7
export OLORIN_NLP_MAX_COST_PER_QUERY=0.10

echo "✓ NLP Features: ENABLED"
echo "✓ Confidence Threshold: $OLORIN_NLP_CONFIDENCE_THRESHOLD"
echo "✓ Max Cost Per Query: \$$OLORIN_NLP_MAX_COST_PER_QUERY"
echo ""

# Check Poetry
if ! command -v poetry &> /dev/null; then
    echo "❌ ERROR: Poetry not found"
    echo "   Install from: https://python-poetry.org/docs/#installation"
    exit 1
fi

BACKEND_PORT="${BACKEND_PORT:-8000}"

echo "🚀 Starting backend on port ${BACKEND_PORT}..."
echo "   API Documentation: http://localhost:${BACKEND_PORT}/docs"
echo "   NLP Health Check: http://localhost:${BACKEND_PORT}/api/v1/nlp/health"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Start uvicorn with reload (will also load from .env file)
poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port "${BACKEND_PORT}"
