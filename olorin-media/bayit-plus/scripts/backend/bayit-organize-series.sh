#!/usr/bin/env bash
###############################################################################
# Bayit+ Series Organization Script
#
# Organizes all series in the database by:
# 1. Scanning the database for all series content
# 2. Grouping episodes by series name and season
# 3. Creating series parent objects (if they don't exist)
# 4. Fetching TMDB metadata for each series
# 5. Linking episodes to their series parent
# 6. Propagating poster/backdrop/metadata to episodes
#
# Usage:
#   ./scripts/backend/bayit-organize-series.sh [options]
#
# Options:
#   --dry-run         Preview changes without applying them
#   --verbose         Show detailed output
#   --help            Show this help message
#
# Examples:
#   # Organize all series
#   ./scripts/backend/bayit-organize-series.sh
#
#   # Preview changes without applying
#   ./scripts/backend/bayit-organize-series.sh --dry-run
#
#   # Verbose output with full details
#   ./scripts/backend/bayit-organize-series.sh --verbose
#
###############################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
ENV_FILE="$BACKEND_DIR/.env"

# Load MongoDB Configuration from environment
if [[ -f "$ENV_FILE" ]]; then
    MONGODB_URI=$(grep "^MONGODB_URI=" "$ENV_FILE" | cut -d'=' -f2-)
else
    echo "Error: .env file not found at $ENV_FILE"
    exit 1
fi

if [[ -z "$MONGODB_URI" ]]; then
    echo "Error: MONGODB_URI not configured in .env file"
    exit 1
fi

# Default options
DRY_RUN=false
VERBOSE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    --help)
      # Extract help from header comments
      sed -n '/^###/,/^###/p' "$0" | sed 's/^# //g' | sed 's/^#//g'
      exit 0
      ;;
    *)
      echo -e "${RED}❌ Unknown option: $1${NC}"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Print header
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  Bayit+ Series Organization                                  ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [[ "$DRY_RUN" == "true" ]]; then
  echo -e "${YELLOW}⚠️  DRY RUN MODE - No changes will be applied${NC}"
  echo ""
fi

# Check if Poetry is installed
if ! command -v poetry &> /dev/null; then
  echo -e "${RED}❌ Poetry is not installed${NC}"
  echo "Please install Poetry: https://python-poetry.org/docs/#installation"
  exit 1
fi

# Check if backend directory exists
if [[ ! -d "$BACKEND_DIR" ]]; then
  echo -e "${RED}❌ Backend directory not found: $BACKEND_DIR${NC}"
  exit 1
fi

# Change to backend directory
cd "$BACKEND_DIR"

# Build Python command
PYTHON_CMD="poetry run python $SCRIPT_DIR/organize_series.py"

# Execute the Python script
echo -e "${BLUE}🔍 Connecting to MongoDB and organizing series...${NC}"
echo ""

# Export MongoDB URI for the Python script
export MONGODB_URI="$MONGODB_URI"

if [[ "$VERBOSE" == "true" ]]; then
  eval "$PYTHON_CMD"
else
  eval "$PYTHON_CMD" 2>&1
fi

EXIT_CODE=$?

echo ""
if [[ $EXIT_CODE -eq 0 ]]; then
  echo -e "${GREEN}✅ Series organization completed successfully${NC}"
else
  echo -e "${RED}❌ Series organization failed with exit code $EXIT_CODE${NC}"
fi
echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"

exit $EXIT_CODE
