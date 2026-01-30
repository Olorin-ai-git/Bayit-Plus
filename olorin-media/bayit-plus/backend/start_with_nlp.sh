#!/bin/bash
# Start Bayit+ Backend with NLP Features Enabled

set -e

# Change to backend directory
cd "$(dirname "$0")"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Bayit+ Backend - Starting with NLP Features"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Load environment configuration (base platform + subplatform)
echo "📦 Loading environment configuration..."
source ./load-env.sh

# Verify NLP is enabled
if [ "$OLORIN_NLP_ENABLED" != "true" ]; then
    echo "❌ ERROR: OLORIN_NLP_ENABLED is not set to 'true'"
    echo "   Current value: $OLORIN_NLP_ENABLED"
    echo ""
    echo "   Please set OLORIN_NLP_ENABLED=true in backend/.env or olorin-infra/.env"
    exit 1
fi

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

# Start uvicorn with reload
poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port "${BACKEND_PORT}"
