#!/usr/bin/env bash
# =============================================================================
# bayit-organize_series
# =============================================================================
#
# Purpose: Script to organize all series in the database.
#
# Execution Context:
#   - Working Directory: /backend
#   - Dependencies: Poetry, Python 3.11+
#   - Prerequisites: MongoDB Atlas connection, GCS credentials
#
# Usage:
#   bayit-organize_series [options]
#
# Options:
{{OPTIONS}}
#
# Examples:
{{EXAMPLES}}
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
readonly PYTHON_SCRIPT="scripts/backend/organize_series.py"

# Default options
{{DEFAULT_OPTIONS}}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
{{ARGUMENT_CASES}}
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
    echo -e "${BLUE}║  Bayit - Organize Series${NC}"
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
        exit 1
    fi

{{ADDITIONAL_PREREQUISITES}}

    echo -e "${GREEN}✓ Prerequisites met${NC}"
    echo ""
}

# Execute the Python script
execute_script() {
    echo -e "${CYAN}Executing bayit-organize_series...${NC}"
    echo ""

    cd "$BACKEND_DIR" || exit 1

    # Build the command
    local cmd="poetry run python $PYTHON_SCRIPT"
{{BUILD_COMMAND}}

    # Execute
    echo -e "${BLUE}Running: $cmd${NC}"
    echo ""

    if eval "$cmd"; then
        echo ""
        echo -e "${GREEN}✓ bayit-organize_series complete${NC}"
        return 0
    else
        echo ""
        echo -e "${RED}✖ bayit-organize_series failed${NC}"
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
