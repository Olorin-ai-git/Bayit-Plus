#!/usr/bin/env bash
# =============================================================================
# Bayit+ Content Category/is_series Mismatch Fix
# =============================================================================
#
# Purpose: Fix data inconsistencies where category_name and is_series fields
#          don't match, causing UI display issues in the Content Library
#
# Problem:
#   - category_name contains "Series" but is_series is False
#   - category_name contains "Movie" but is_series is True
#   - Frontend displays type based on is_series, causing confusion
#
# Usage:
#   bayit-fix-category-mismatch.sh [options]
#
# Options:
#   --dry-run    Preview changes without making them (default)
#   --live       Execute changes (update database)
#   --help       Show this help message
#
# Examples:
#   # Preview what would be fixed (safe, no changes)
#   bayit-fix-category-mismatch.sh
#
#   # Preview with explicit flag
#   bayit-fix-category-mismatch.sh --dry-run
#
#   # Execute the fixes
#   bayit-fix-category-mismatch.sh --live
#
# =============================================================================

set -euo pipefail

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m'

# Get project root
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
readonly BACKEND_DIR="$PROJECT_ROOT/backend"
readonly PYTHON_SCRIPT="$BACKEND_DIR/fix_content_category_mismatch.py"

# Default options
DRY_RUN=true
LIVE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            LIVE=false
            shift
            ;;
        --live)
            DRY_RUN=false
            LIVE=true
            shift
            ;;
        --help)
            grep "^#" "$0" | sed 's/^# \?//'
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Print header
print_header() {
    echo ""
    echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  Bayit+ Content Category/is_series Mismatch Fix              ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Check prerequisites
check_prerequisites() {
    echo -e "${CYAN}Checking prerequisites...${NC}"

    # Check if Poetry is installed
    if ! command -v poetry &> /dev/null; then
        echo -e "${RED}✖ Poetry not found${NC}"
        echo "  Install Poetry from: https://python-poetry.org/docs/#installation"
        exit 1
    fi

    # Check if backend directory exists
    if [ ! -d "$BACKEND_DIR" ]; then
        echo -e "${RED}✖ Backend directory not found: $BACKEND_DIR${NC}"
        exit 1
    fi

    # Check if Python script exists
    if [ ! -f "$PYTHON_SCRIPT" ]; then
        echo -e "${RED}✖ Python script not found: $PYTHON_SCRIPT${NC}"
        echo "  Expected: $PYTHON_SCRIPT"
        exit 1
    fi

    # Check MongoDB connection (optional - script will fail gracefully if not available)
    echo -e "${CYAN}Checking MongoDB connection...${NC}"
    if [ -z "${MONGODB_URI:-}" ]; then
        echo -e "${YELLOW}⚠  MONGODB_URI not set in environment${NC}"
        echo "  Script will use default from config"
    else
        echo -e "${GREEN}✓ MONGODB_URI configured${NC}"
    fi

    echo -e "${GREEN}✓ Prerequisites met${NC}"
    echo ""
}

# Execute the Python script
execute_script() {
    echo -e "${CYAN}Executing category mismatch fix...${NC}"
    echo ""

    cd "$BACKEND_DIR" || exit 1

    # Show mode
    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}╔═══════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${YELLOW}║  DRY RUN MODE - No changes will be made to the database      ║${NC}"
        echo -e "${YELLOW}║  Add --live flag to execute changes                          ║${NC}"
        echo -e "${YELLOW}╚═══════════════════════════════════════════════════════════════╝${NC}"
        echo ""
    else
        echo -e "${RED}╔═══════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${RED}║  LIVE MODE - Changes will be written to the database          ║${NC}"
        echo -e "${RED}╚═══════════════════════════════════════════════════════════════╝${NC}"
        echo ""

        # Confirmation prompt for live mode
        read -p "Are you sure you want to proceed? (yes/no): " -r
        echo
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            echo -e "${YELLOW}Operation cancelled${NC}"
            exit 0
        fi
    fi

    # Build the command
    local cmd="poetry run python fix_content_category_mismatch.py"

    # Execute
    echo -e "${BLUE}Running: $cmd${NC}"
    echo ""

    if eval "$cmd"; then
        echo ""
        if [ "$DRY_RUN" = true ]; then
            echo -e "${GREEN}✓ Preview complete${NC}"
            echo -e "${CYAN}Run with --live to apply changes${NC}"
        else
            echo -e "${GREEN}✓ Category mismatch fix complete${NC}"
        fi
        return 0
    else
        echo ""
        echo -e "${RED}✖ Fix script failed${NC}"
        return 1
    fi
}

# Main execution
main() {
    print_header
    check_prerequisites
    execute_script
}

main "$@"
