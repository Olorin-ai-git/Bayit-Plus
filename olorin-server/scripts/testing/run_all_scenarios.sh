#!/bin/bash
set -e

# All Scenarios Test Runner
# Runs all 10 autonomous investigation scenarios

echo "🔧 Setting up environment for all autonomous investigation scenarios..."

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
VERBOSE=""
SAVE=""

while [[ $# -gt 0 ]]; do
    case $1 in
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
            echo "Usage: $0 [--verbose] [--save]"
            exit 1
            ;;
    esac
done

# Build the command
CMD="poetry run python tests/autonomous/run_all_scenarios.py"

if [ ! -z "$VERBOSE" ]; then
    CMD="$CMD $VERBOSE"
fi

if [ ! -z "$SAVE" ]; then
    CMD="$CMD $SAVE"
fi

echo "🚀 Running all 10 autonomous investigation scenarios..."
echo "⏰ This will take several minutes to complete..."

# Run all scenarios
eval $CMD