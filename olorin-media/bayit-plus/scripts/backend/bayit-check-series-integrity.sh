#!/usr/bin/env bash
###############################################################################
# Bayit+ Series Episodes Integrity Check
#
# Verifies database integrity by comparing series episode metadata against
# actual episode documents. Identifies discrepancies where series claim to
# have episodes that don't exist in the database.
#
# Usage:
#   ./scripts/backend/check-series-integrity.sh [options]
#
# Options:
#   --series-name NAME    Check specific series by name
#   --series-id ID        Check specific series by ID
#   --verbose             Show detailed output for each series
#   --json                Output results in JSON format
#   --help                Show this help message
#
# Examples:
#   # Check all series
#   ./scripts/backend/check-series-integrity.sh
#
#   # Check specific series
#   ./scripts/backend/check-series-integrity.sh --series-name "burganim"
#
#   # Verbose output with full details
#   ./scripts/backend/check-series-integrity.sh --verbose
#
#   # JSON output for parsing
#   ./scripts/backend/check-series-integrity.sh --json
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

# Default options
SERIES_NAME=""
SERIES_ID=""
VERBOSE=false
JSON_OUTPUT=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --series-name)
      SERIES_NAME="$2"
      shift 2
      ;;
    --series-id)
      SERIES_ID="$2"
      shift 2
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    --json)
      JSON_OUTPUT=true
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
if [[ "$JSON_OUTPUT" == "false" ]]; then
  echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║  Bayit+ Series Episodes Integrity Check                      ║${NC}"
  echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
  echo ""
fi

# Check if Poetry is installed
if ! command -v poetry &> /dev/null; then
  echo -e "${RED}❌ Poetry is not installed${NC}"
  echo "Please install Poetry: https://python-poetry.org/docs/#installation"
  exit 1
fi

# Check if .env file exists
if [[ ! -f "$PROJECT_ROOT/.env" ]]; then
  echo -e "${YELLOW}⚠️  Warning: .env file not found at $PROJECT_ROOT/.env${NC}"
  echo "Make sure MongoDB connection settings are in environment variables"
fi

# Change to backend directory
cd "$BACKEND_DIR"

# Build Python command with options
PYTHON_CMD="poetry run python $SCRIPT_DIR/find_missing_episodes.py"

if [[ -n "$SERIES_NAME" ]]; then
  PYTHON_CMD="$PYTHON_CMD --series-name \"$SERIES_NAME\""
fi

if [[ -n "$SERIES_ID" ]]; then
  PYTHON_CMD="$PYTHON_CMD --series-id \"$SERIES_ID\""
fi

if [[ "$VERBOSE" == "true" ]]; then
  PYTHON_CMD="$PYTHON_CMD --verbose"
fi

if [[ "$JSON_OUTPUT" == "true" ]]; then
  PYTHON_CMD="$PYTHON_CMD --json"
fi

# Execute the Python script
if [[ "$JSON_OUTPUT" == "false" ]]; then
  echo -e "${BLUE}🔍 Connecting to MongoDB and analyzing series...${NC}"
  echo ""
fi

eval "$PYTHON_CMD"

EXIT_CODE=$?

if [[ "$JSON_OUTPUT" == "false" ]]; then
  echo ""
  if [[ $EXIT_CODE -eq 0 ]]; then
    echo -e "${GREEN}✅ Integrity check completed successfully${NC}"
  else
    echo -e "${RED}❌ Integrity check failed with exit code $EXIT_CODE${NC}"
  fi
  echo ""
  echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
fi

exit $EXIT_CODE
