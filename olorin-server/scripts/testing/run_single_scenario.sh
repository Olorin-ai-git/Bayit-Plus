#!/bin/bash
set -e

# Single Scenario Test Runner
# Quickly test a single autonomous investigation scenario

if [ $# -eq 0 ]; then
    echo "Usage: $0 <scenario_number> [--verbose]"
    echo "Example: $0 1 --verbose"
    exit 1
fi

SCENARIO_NUM=$1
VERBOSE_FLAG=""

if [ "$2" = "--verbose" ] || [ "$2" = "-v" ]; then
    VERBOSE_FLAG="--verbose"
fi

echo "🔧 Setting up environment for scenario $SCENARIO_NUM..."

# Get the Firebase API key
echo "📡 Retrieving Anthropic API key from Firebase secrets..."
API_KEY=$(firebase functions:secrets:access ANTHROPIC_API_KEY --project olorin-ai)

if [ -z "$API_KEY" ]; then
    echo "❌ Failed to retrieve API key from Firebase secrets"
    exit 1
fi

echo "✅ API key retrieved successfully"

# Set up environment
export ANTHROPIC_API_KEY="$API_KEY"
export PYTHONPATH="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
export OLORIN_USE_DEMO_DATA=true

echo "📝 Using demo data for Splunk connections (OLORIN_USE_DEMO_DATA=true)"
echo "🚀 Running scenario $SCENARIO_NUM..."

# Run the specific scenario
poetry run python tests/autonomous/run_all_scenarios.py --scenarios $SCENARIO_NUM $VERBOSE_FLAG