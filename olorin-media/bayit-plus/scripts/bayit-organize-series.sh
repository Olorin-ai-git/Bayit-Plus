#!/usr/bin/env bash
# =============================================================================
# Bayit+ Series Organization Script
# =============================================================================
#
# Purpose: Organize all series in the database
#
# Usage:
#   bayit-organize-series.sh [options]
#
# Options:
#   --dry-run    Preview changes without making them
#   --limit N    Limit processing to N series
#   --help       Show this help message
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
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
readonly BACKEND_DIR="$PROJECT_ROOT/backend"

# Default options
DRY_RUN=false
LIMIT=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --limit)
            LIMIT="$2"
            shift 2
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
    echo -e "${BLUE}║  Bayit+ Series Organization${NC}"
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

    # Check if organize_series.py exists
    if [ ! -f "$SCRIPT_DIR/organize_series.py" ]; then
        echo -e "${RED}✖ organize_series.py not found in scripts directory${NC}"
        exit 1
    fi

    echo -e "${GREEN}✓ Prerequisites met${NC}"
    echo ""
}

# Execute the Python script
execute_script() {
    echo -e "${CYAN}Executing series organization...${NC}"
    echo ""

    cd "$BACKEND_DIR" || exit 1

    # Build the command
    local cmd="poetry run python ../scripts/organize_series.py"

    if [ "$DRY_RUN" = true ]; then
        cmd="$cmd --dry-run"
        echo -e "${YELLOW}Running in DRY RUN mode (no changes will be made)${NC}"
        echo ""
    fi

    if [ -n "$LIMIT" ]; then
        cmd="$cmd --limit $LIMIT"
        echo -e "${CYAN}Limiting to $LIMIT series${NC}"
        echo ""
    fi

    # Execute
    echo -e "${BLUE}Running: $cmd${NC}"
    echo ""

    if eval "$cmd"; then
        echo ""
        echo -e "${GREEN}✓ Series organization complete${NC}"
        return 0
    else
        echo ""
        echo -e "${RED}✖ Series organization failed${NC}"
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
