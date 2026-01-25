#!/usr/bin/env bash
###############################################################################
# Bayit+ Content Title Cleanup Script
#
# Cleans up content titles by:
# 1. Removing release group tags ([YTS MX], -GalaxyTV, etc.)
# 2. Removing quality tags (REPACK, AAC5, XviD, etc.)
# 3. Extracting series names from episode titles
# 4. Setting is_series, season, episode fields correctly
#
# Usage:
#   ./scripts/backend/bayit-cleanup-titles.sh [options]
#
# Options:
#   --dry-run             Preview without making changes
#   --content-id ID       Process specific content item by ID
#   --help                Show this help message
#
###############################################################################

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"

# Default options
DRY_RUN=false
CONTENT_ID=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --content-id)
      CONTENT_ID="$2"
      shift 2
      ;;
    --help)
      sed -n '/^###/,/^###/p' "$0" | sed 's/^# //g' | sed 's/^#//g'
      exit 0
      ;;
    *)
      echo -e "${RED}❌ Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  Bayit+ Content Title Cleanup                                ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Configuration:${NC}"
echo "  Dry Run: $DRY_RUN"
[[ -n "$CONTENT_ID" ]] && echo "  Content ID: $CONTENT_ID"
echo ""

cd "$BACKEND_DIR"

# Run cleanup
PYTHON_CMD=$(cat <<'PYTHON_EOF'
import asyncio
import sys
from app.core.database import connect_to_mongo
from app.models.content import Content
from app.services.content_cleanup_service import ContentCleanupService

async def cleanup_titles(dry_run: bool, content_id: str = None):
    await connect_to_mongo()

    # Query content items
    if content_id:
        items = await Content.find({"_id": content_id}).to_list()
    else:
        items = await Content.find().to_list(length=None)

    print(f"🔍 Found {len(items)} content items to process\n")

    cleanup_service = ContentCleanupService()
    updated_count = 0

    for idx, item in enumerate(items, 1):
        # Clean the title
        cleaned = cleanup_service.clean_title(item.title)

        changes = []

        # Check if title changed
        if cleaned["clean_title"] != item.title:
            changes.append(f"title: '{item.title}' -> '{cleaned['clean_title']}'")

        # Check if is_series needs updating
        if cleaned["is_series"] != item.is_series:
            changes.append(f"is_series: {item.is_series} -> {cleaned['is_series']}")

        # Check if season/episode needs updating
        if cleaned["season"] and cleaned["season"] != item.season:
            changes.append(f"season: {item.season} -> {cleaned['season']}")

        if cleaned["episode"] and cleaned["episode"] != item.episode:
            changes.append(f"episode: {item.episode} -> {cleaned['episode']}")

        # Check if series name should be added to title_en
        if cleaned["series_name"] and not item.title_en:
            changes.append(f"title_en: None -> '{cleaned['series_name']}'")

        if changes:
            print(f"[{idx}/{len(items)}] {item.title}")
            for change in changes:
                print(f"   📝 {change}")

            if not dry_run:
                # Apply changes
                item.title = cleaned["clean_title"]
                item.is_series = cleaned["is_series"]
                if cleaned["season"]:
                    item.season = cleaned["season"]
                if cleaned["episode"]:
                    item.episode = cleaned["episode"]
                if cleaned["series_name"] and not item.title_en:
                    item.title_en = cleaned["series_name"]

                await item.save()
                print(f"   ✅ Updated")
            else:
                print(f"   🔍 Would update (dry run)")

            print("")
            updated_count += 1

    print("=" * 80)
    if dry_run:
        print(f"DRY RUN: Would update {updated_count} items")
    else:
        print(f"✅ Updated {updated_count} items")
    print("=" * 80)

# Entry point
dry_run = sys.argv[1] == "true"
content_id = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] != "" else None

asyncio.run(cleanup_titles(dry_run, content_id))
PYTHON_EOF
)

poetry run python -c "$PYTHON_CMD" "$DRY_RUN" "$CONTENT_ID"

echo ""
echo -e "${GREEN}✅ Title cleanup completed${NC}"
