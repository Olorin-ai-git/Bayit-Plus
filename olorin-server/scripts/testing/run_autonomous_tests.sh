#!/bin/bash
set -e

# Autonomous Investigation Test Runner
# Automatically retrieves API key from Firebase secrets and runs tests

echo "🔧 Setting up environment for autonomous investigation tests..."

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
export PYTHONPATH="/Users/gklainert/Documents/olorin/olorin-server"

# Parse command line arguments
SCENARIOS=""
VERBOSE=""
SAVE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --scenarios)
            SCENARIOS="$2"
            shift 2
            ;;
        --verbose|-v)
            VERBOSE="--verbose"
            shift
            ;;
        --save)
            SAVE="--save"
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--scenarios N] [--verbose] [--save]"
            exit 1
            ;;
    esac
done

# Build the command
CMD="poetry run python tests/autonomous/run_all_scenarios.py"

if [ ! -z "$SCENARIOS" ]; then
    CMD="$CMD --scenarios $SCENARIOS"
fi

if [ ! -z "$VERBOSE" ]; then
    CMD="$CMD $VERBOSE"
fi

if [ ! -z "$SAVE" ]; then
    CMD="$CMD $SAVE"
fi

echo "🚀 Running autonomous investigation tests..."
echo "Command: $CMD"

# Run the tests with proper environment
eval $CMD