#!/usr/bin/env bash
###############################################################################
# Bayit+ Audiobook Organization Script
#
# Organizes all audiobooks in the database by:
# 1. Retrieving book posters from Google Books API / Open Library
# 2. Verifying and cleaning title names
# 3. Verifying folder/file structure mapping to audiobook titles
# 4. Checking stream integrity (audio playability)
# 5. Overall cleanup and organization
# 6. Generating a final report
#
# Usage:
#   ./scripts/backend/bayit-organize-audiobooks.sh [options]
#
# Options:
#   --dry-run         Preview changes without applying them
#   --verbose         Show detailed output
#   --limit N         Limit processing to N audiobooks
#   --fix             Auto-fix issues where possible
#   --report FILE     Save report to file
#   --help            Show this help message
#
# Examples:
#   # Scan and report on all audiobooks (no changes)
#   ./scripts/backend/bayit-organize-audiobooks.sh
#
#   # Preview what would be fixed
#   ./scripts/backend/bayit-organize-audiobooks.sh --dry-run --fix
#
#   # Actually fix issues and save report
#   ./scripts/backend/bayit-organize-audiobooks.sh --fix --report audiobooks-report.txt
#
#   # Process only first 50 audiobooks with verbose output
#   ./scripts/backend/bayit-organize-audiobooks.sh --limit 50 --verbose
#
###############################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
ENV_FILE="$BACKEND_DIR/.env"

# Load MongoDB Configuration from environment
if [[ -f "$ENV_FILE" ]]; then
    # Source the env file to get MONGODB_URI
    set -a
    source "$ENV_FILE" 2>/dev/null || true
    set +a

    # Also try direct extraction
    if [[ -z "${MONGODB_URI:-}" ]]; then
        MONGODB_URI=$(grep "^MONGODB_URI=" "$ENV_FILE" | cut -d'=' -f2-)
    fi
else
    echo -e "${RED}Error: .env file not found at $ENV_FILE${NC}"
    exit 1
fi

if [[ -z "${MONGODB_URI:-}" ]]; then
    echo -e "${RED}Error: MONGODB_URI not configured in .env file${NC}"
    exit 1
fi

# Default options
DRY_RUN=""
VERBOSE=""
LIMIT=""
FIX=""
REPORT=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN="--dry-run"
      shift
      ;;
    --verbose|-v)
      VERBOSE="--verbose"
      shift
      ;;
    --limit)
      LIMIT="--limit $2"
      shift 2
      ;;
    --fix)
      FIX="--fix"
      shift
      ;;
    --report)
      REPORT="--report $2"
      shift 2
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
echo -e "${CYAN}║  Bayit+ Audiobook Organization                               ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Show configuration
echo -e "${BLUE}Configuration:${NC}"
[[ -n "$DRY_RUN" ]] && echo -e "  ${YELLOW}Dry Run: Yes (no changes will be applied)${NC}"
[[ -z "$DRY_RUN" ]] && echo "  Dry Run: No"
[[ -n "$VERBOSE" ]] && echo "  Verbose: Yes"
[[ -n "$LIMIT" ]] && echo "  Limit: ${LIMIT#--limit }"
[[ -n "$FIX" ]] && echo -e "  ${GREEN}Auto-Fix: Enabled${NC}"
[[ -z "$FIX" ]] && echo "  Auto-Fix: Disabled (report only)"
[[ -n "$REPORT" ]] && echo "  Report File: ${REPORT#--report }"
echo ""

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

# Verify Python script exists
PYTHON_SCRIPT="$SCRIPT_DIR/organize_audiobooks.py"
if [[ ! -f "$PYTHON_SCRIPT" ]]; then
    echo -e "${RED}❌ Python script not found: $PYTHON_SCRIPT${NC}"
    exit 1
fi

# Build Python command
PYTHON_CMD="poetry run python $PYTHON_SCRIPT $DRY_RUN $VERBOSE $LIMIT $FIX $REPORT"

# Execute the Python script
echo -e "${BLUE}🔍 Connecting to MongoDB and organizing audiobooks...${NC}"
echo ""

# Export MongoDB URI for the Python script
export MONGODB_URI="$MONGODB_URI"

# Check for Google Books API key (optional but recommended)
if [[ -z "${GOOGLE_BOOKS_API_KEY:-}" ]]; then
    GOOGLE_BOOKS_API_KEY=$(grep "^GOOGLE_BOOKS_API_KEY=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2- || true)
    if [[ -n "$GOOGLE_BOOKS_API_KEY" ]]; then
        export GOOGLE_BOOKS_API_KEY="$GOOGLE_BOOKS_API_KEY"
    else
        echo -e "${YELLOW}⚠️  GOOGLE_BOOKS_API_KEY not set - poster search may be rate-limited${NC}"
        echo ""
    fi
fi

# Run the script
eval "$PYTHON_CMD"
EXIT_CODE=$?

echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
if [[ $EXIT_CODE -eq 0 ]]; then
    echo -e "${GREEN}✅ Audiobook organization completed successfully${NC}"
else
    echo -e "${RED}❌ Audiobook organization failed with exit code $EXIT_CODE${NC}"
fi
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"

exit $EXIT_CODE
