#!/bin/bash
################################################################################
# Bayit+ Library Integrity Verification
#
# Zero-trust verification of complete media library integrity.
# Verifies GCS files, recalculates hashes, validates metadata, tests streaming.
#
# Usage:
#   ./bayit-verify-library-integrity.sh [OPTIONS]
#
# Options:
#   --dry-run                 Preview only, no database updates (default)
#   --live                    Execute changes (update hashes, metadata)
#   --batch-size N            Items per batch (default: 50)
#   --concurrency N           Max concurrent verifications (default: 10)
#   --category ID             Filter by category ID
#   --limit N                 Max items to process
#   --verify-hashes           Recalculate file hashes (EXPENSIVE)
#   --verify-streaming        Test streaming URLs (adds 2-5s per item)
#   --rehydrate-metadata      Re-fetch metadata from TMDB
#   --resume-from PATH        Resume from checkpoint file
#   --help                    Show this help message
#
# Examples:
#   # Quick preview (metadata + GCS checks only)
#   ./bayit-verify-library-integrity.sh --dry-run
#
#   # Live verification with metadata rehydration
#   ./bayit-verify-library-integrity.sh --live --rehydrate-metadata
#
#   # Deep verification with all checks (very slow)
#   ./bayit-verify-library-integrity.sh --verify-hashes --verify-streaming --dry-run
#
#   # Verify specific category
#   ./bayit-verify-library-integrity.sh --category movies --limit 500
################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
PYTHON_SCRIPT="$SCRIPT_DIR/verify_library_integrity.py"

# Check if Python script exists
if [ ! -f "$PYTHON_SCRIPT" ]; then
    echo -e "${RED}❌ Error: Python script not found at $PYTHON_SCRIPT${NC}"
    exit 1
fi

# Check if backend directory exists
if [ ! -d "$BACKEND_DIR" ]; then
    echo -e "${RED}❌ Error: Backend directory not found at $BACKEND_DIR${NC}"
    exit 1
fi

# Function to show help
show_help() {
    echo "Bayit+ Library Integrity Verification"
    echo ""
    echo "Zero-trust verification of complete media library."
    echo ""
    echo "Usage:"
    echo "  $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --dry-run                 Preview only, no database updates (default)"
    echo "  --live                    Execute changes (update hashes, metadata)"
    echo "  --batch-size N            Items per batch (default: 50)"
    echo "  --concurrency N           Max concurrent verifications (default: 10)"
    echo "  --category ID             Filter by category ID"
    echo "  --limit N                 Max items to process"
    echo "  --verify-hashes           Recalculate file hashes (EXPENSIVE)"
    echo "  --verify-streaming        Test streaming URLs (adds 2-5s per item)"
    echo "  --rehydrate-metadata      Re-fetch metadata from TMDB"
    echo "  --resume-from PATH        Resume from checkpoint file"
    echo "  --help                    Show this help message"
    echo ""
    echo "Examples:"
    echo "  # Quick preview (metadata + GCS checks only)"
    echo "  $0 --dry-run"
    echo ""
    echo "  # Live verification with metadata rehydration"
    echo "  $0 --live --rehydrate-metadata"
    echo ""
    echo "  # Deep verification with all checks (very slow)"
    echo "  $0 --verify-hashes --verify-streaming --dry-run"
    echo ""
    echo "  # Verify specific category"
    echo "  $0 --category movies --limit 500"
    echo ""
    echo "Performance Estimates:"
    echo "  Light (metadata + GCS):     ~17 minutes for 50K items"
    echo "  Medium (+ accessibility):   ~40 minutes for 50K items (recommended)"
    echo "  Full (+ hash + streaming):  ~69 hours for 50K items"
    exit 0
}

# Check for help flag
if [[ "$1" == "--help" ]] || [[ "$1" == "-h" ]]; then
    show_help
fi

# Display header
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       Bayit+ Library Integrity Verification System                 ║${NC}"
echo -e "${BLUE}║       Zero-Trust Media Library Verification                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if poetry is installed
if ! command -v poetry &> /dev/null; then
    echo -e "${RED}❌ Poetry is not installed or not in PATH${NC}"
    echo -e "${YELLOW}Install Poetry: curl -sSL https://install.python-poetry.org | python3 -${NC}"
    exit 1
fi

# Change to backend directory for poetry
cd "$BACKEND_DIR"

# Check if poetry environment is set up
if ! poetry env info &> /dev/null; then
    echo -e "${YELLOW}⚙️  Poetry environment not found. Installing dependencies...${NC}"
    poetry install
fi

echo -e "${GREEN}🚀 Starting library integrity verification...${NC}"
echo ""

# Run Python script with all arguments passed through
poetry run python "$PYTHON_SCRIPT" "$@"

# Capture exit code
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Verification completed successfully${NC}"
else
    echo ""
    echo -e "${RED}❌ Verification failed with exit code $EXIT_CODE${NC}"
fi

exit $EXIT_CODE
