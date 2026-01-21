#!/bin/bash
# LLM Training Pipeline Script
# Feature: 026-llm-training-pipeline
#
# Usage:
#   ./scripts/train_llm.sh                    # Run with defaults from .env
#   ./scripts/train_llm.sh --samples 100      # Override sample size
#   ./scripts/train_llm.sh --prompt v4        # Use specific prompt version
#   ./scripts/train_llm.sh --dry-run          # Show config without running

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# Default values (can be overridden via command line)
SAMPLE_SIZE=""
PROMPT_VERSION=""
DRY_RUN=false
VERBOSE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --samples|-s)
            SAMPLE_SIZE="$2"
            shift 2
            ;;
        --prompt|-p)
            PROMPT_VERSION="$2"
            shift 2
            ;;
        --dry-run|-d)
            DRY_RUN=true
            shift
            ;;
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --help|-h)
            echo "LLM Training Pipeline"
            echo ""
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --samples, -s <N>     Maximum number of samples (default: from .env)"
            echo "  --prompt, -p <ver>    Prompt version to use (v1, v2, v3, v4)"
            echo "  --dry-run, -d         Show configuration without running"
            echo "  --verbose, -v         Show detailed output"
            echo "  --help, -h            Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 --samples 100 --prompt v4"
            echo "  $0 -s 50 -p v4 --dry-run"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Build environment variables for the run
ENV_VARS="LLM_REASONING_ENABLED=true PYTHONUNBUFFERED=1"

if [[ -n "$SAMPLE_SIZE" ]]; then
    ENV_VARS="$ENV_VARS LLM_TRAINING_MAX_SAMPLE_SIZE=$SAMPLE_SIZE"
fi

if [[ -n "$PROMPT_VERSION" ]]; then
    ENV_VARS="$ENV_VARS LLM_PROMPT_ACTIVE_VERSION=$PROMPT_VERSION"
fi

# Show configuration
echo "================================================================================"
echo "LLM TRAINING PIPELINE"
echo "================================================================================"
echo ""
echo "Configuration:"
echo "  Project Directory: $PROJECT_DIR"
if [[ -n "$SAMPLE_SIZE" ]]; then
    echo "  Sample Size:       $SAMPLE_SIZE (override)"
else
    echo "  Sample Size:       (from .env)"
fi
if [[ -n "$PROMPT_VERSION" ]]; then
    echo "  Prompt Version:    $PROMPT_VERSION (override)"
else
    echo "  Prompt Version:    (from .env)"
fi
echo ""
echo "Environment:"
echo "  $ENV_VARS"
echo ""

if [[ "$DRY_RUN" == true ]]; then
    echo "[DRY RUN] Would execute:"
    echo "  cd $PROJECT_DIR && $ENV_VARS poetry run python scripts/run_llm_training.py"
    exit 0
fi

# Run the training
echo "Starting training..."
echo "================================================================================"
echo ""

eval "$ENV_VARS poetry run python scripts/run_llm_training.py"

echo ""
echo "================================================================================"
echo "Training complete."
