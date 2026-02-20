#!/usr/bin/env bash
# =============================================================================
# Regenerate Avatar Interaction Videos
# =============================================================================
#
# Replaces old Creatify stock persona videos with Aurora lip-sync using
# correct per-character cloned voices and face images.
# Works for any content item with interactive_characters configured.
#
# Usage:
#   ./scripts/regenerate-interaction-videos.sh --imdb-id tt0088763
#   ./scripts/regenerate-interaction-videos.sh --imdb-id tt0088763 --dry-run
#   ./scripts/regenerate-interaction-videos.sh --imdb-id tt0088763 --moments-only
#   ./scripts/regenerate-interaction-videos.sh --imdb-id tt0088763 --sessions-only
#
# =============================================================================

set -euo pipefail

readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

print_header() {
    echo ""
    echo -e "${BLUE}=========================================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}=========================================================${NC}"
    echo ""
}

print_header "Interaction Video Regeneration"

HAS_IMDB_ID=false
DRY_RUN=false
for arg in "$@"; do
    if [ "$arg" = "--dry-run" ]; then
        DRY_RUN=true
    fi
    if [ "$arg" = "--imdb-id" ]; then
        HAS_IMDB_ID=true
    fi
done

if [ "$HAS_IMDB_ID" = false ]; then
    echo -e "${RED}--imdb-id is required (e.g. --imdb-id tt0088763)${NC}"
    exit 1
fi

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}[DRY RUN] Scanning only - no APIs will be called${NC}"
    echo ""
fi

if ! command -v poetry &> /dev/null; then
    echo -e "${RED}Poetry not found. Install: https://python-poetry.org${NC}"
    exit 1
fi

echo -e "${GREEN}Running regeneration script...${NC}"
echo ""

cd "$PROJECT_ROOT/backend" && poetry run python "$SCRIPT_DIR/regenerate_interaction_videos.py" "$@"
EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}Regeneration completed successfully.${NC}"
else
    echo -e "${RED}Regeneration failed (exit code $EXIT_CODE).${NC}"
fi

exit $EXIT_CODE
