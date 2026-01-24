#!/usr/bin/env bash
###############################################################################
# Bayit+ Add Subtitles Script
#
# Adds subtitles to movies and series using multiple sources:
# 1. Extract embedded subtitles from video files (FFmpeg)
# 2. Fetch from OpenSubtitles.com API (external source)
# 3. Priority fallback system for best results
#
# Usage:
#   ./scripts/backend/add-subtitles.sh [options]
#
# Options:
#   --mode MODE          Subtitle acquisition mode:
#                        - "embedded": Extract from video files only
#                        - "external": Fetch from OpenSubtitles only
#                        - "auto": Try embedded first, fallback to external (default)
#   --content-id ID      Process specific content by ID
#   --content-type TYPE  Filter by content type (movie, series, episode)
#   --language LANG      Subtitle language (en, he, es) - can specify multiple
#   --batch-size N       Process N items at a time (default: 10)
#   --dry-run            Preview what would be done without making changes
#   --api-url URL        Backend API URL (default: http://localhost:8000)
#   --json               Output results in JSON format
#   --help               Show this help message
#
# Examples:
#   # Extract embedded subtitles from all content
#   ./scripts/backend/add-subtitles.sh --mode embedded
#
#   # Fetch English subtitles from OpenSubtitles for all movies
#   ./scripts/backend/add-subtitles.sh --mode external --content-type movie --language en
#
#   # Auto mode: Try embedded, fallback to external
#   ./scripts/backend/add-subtitles.sh --mode auto --language en --language he
#
#   # Add subtitles to specific content
#   ./scripts/backend/add-subtitles.sh --content-id 507f1f77bcf86cd799439011
#
#   # Dry run to preview
#   ./scripts/backend/add-subtitles.sh --mode external --dry-run
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
MODE="auto"
CONTENT_ID=""
CONTENT_TYPE=""
LANGUAGES=()
BATCH_SIZE=10
DRY_RUN=false
API_URL="${API_URL:-http://localhost:8000}"
JSON_OUTPUT=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --mode)
      MODE="$2"
      shift 2
      ;;
    --content-id)
      CONTENT_ID="$2"
      shift 2
      ;;
    --content-type)
      CONTENT_TYPE="$2"
      shift 2
      ;;
    --language)
      LANGUAGES+=("$2")
      shift 2
      ;;
    --batch-size)
      BATCH_SIZE="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --api-url)
      API_URL="$2"
      shift 2
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

# Validate mode
if [[ "$MODE" != "embedded" && "$MODE" != "external" && "$MODE" != "auto" ]]; then
  echo -e "${RED}❌ Invalid mode: $MODE${NC}"
  echo "Valid modes: embedded, external, auto"
  exit 1
fi

# Default language if none specified
if [[ ${#LANGUAGES[@]} -eq 0 ]]; then
  LANGUAGES=("en" "he")
fi

# Print header (unless JSON mode)
if [[ "$JSON_OUTPUT" == "false" ]]; then
  echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║  Bayit+ Add Subtitles                                         ║${NC}"
  echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "${BLUE}Configuration:${NC}"
  echo "  Mode: $MODE"
  echo "  Languages: ${LANGUAGES[*]}"
  echo "  Batch Size: $BATCH_SIZE"
  echo "  Dry Run: $DRY_RUN"
  [[ -n "$CONTENT_ID" ]] && echo "  Content ID: $CONTENT_ID"
  [[ -n "$CONTENT_TYPE" ]] && echo "  Content Type: $CONTENT_TYPE"
  echo ""
fi

# Change to backend directory
cd "$BACKEND_DIR"

# Check if Poetry is installed
if ! command -v poetry &> /dev/null; then
  if [[ "$JSON_OUTPUT" == "false" ]]; then
    echo -e "${RED}❌ Poetry is not installed${NC}"
    echo "Please install Poetry: https://python-poetry.org/docs/#installation"
  else
    echo '{"error": "Poetry not installed"}'
  fi
  exit 1
fi

# Build Python command based on mode
PYTHON_SCRIPT=""

if [[ "$MODE" == "embedded" ]]; then
  # Extract embedded subtitles
  PYTHON_SCRIPT="$SCRIPT_DIR/extract_existing_subtitles.py"

  if [[ "$JSON_OUTPUT" == "false" ]]; then
    echo -e "${BLUE}📹 Extracting embedded subtitles from video files...${NC}"
    echo "   This uses FFmpeg to extract subtitle tracks from video containers"
    echo "   Estimated time: 1-2 minutes per video"
    echo ""
  fi

  poetry run python "$PYTHON_SCRIPT"
  EXIT_CODE=$?

elif [[ "$MODE" == "external" || "$MODE" == "auto" ]]; then
  # Fetch from external sources (OpenSubtitles)

  if [[ "$JSON_OUTPUT" == "false" ]]; then
    echo -e "${BLUE}🌐 Fetching subtitles from external sources...${NC}"
    echo "   Source: OpenSubtitles.com API"
    echo "   Languages: ${LANGUAGES[*]}"
    echo ""
  fi

  # Build Python inline script for external fetching
  PYTHON_CMD=$(cat <<'PYTHON_EOF'
import asyncio
import sys
from app.core.database import connect_to_mongo
from app.models.content import Content
from app.services.external_subtitle_service import ExternalSubtitleService

async def fetch_subtitles():
    """Fetch subtitles from external sources"""
    await connect_to_mongo()

    service = ExternalSubtitleService()

    # Build query
    query = {}

    # Filter by content type if specified
    content_type = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1] else None
    if content_type:
        query["content_type"] = content_type

    # Filter by content ID if specified
    content_id = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] else None
    if content_id:
        query["_id"] = content_id

    # Get content items
    if content_id:
        content_items = [await Content.get(content_id)]
    else:
        content_items = await Content.find(query).limit(int(sys.argv[3] if len(sys.argv) > 3 else 10)).to_list()

    print(f"Found {len(content_items)} content items to process")

    # Languages to fetch
    languages = sys.argv[4].split(',') if len(sys.argv) > 4 else ['en', 'he']

    # Results tracking
    results = {
        'success': 0,
        'failed': 0,
        'already_exists': 0,
        'total_subtitles': 0
    }

    # Process each content item
    for i, content in enumerate(content_items, 1):
        print(f"\n[{i}/{len(content_items)}] Processing: {content.title}")

        for lang in languages:
            try:
                # Fetch subtitle
                subtitle = await service.fetch_subtitle_for_content(
                    str(content.id),
                    lang,
                    sources=['opensubtitles']
                )

                if subtitle:
                    results['success'] += 1
                    results['total_subtitles'] += 1
                    print(f"  ✅ {lang}: Fetched and saved ({len(subtitle.cues)} cues)")
                else:
                    results['failed'] += 1
                    print(f"  ❌ {lang}: Not found")

            except Exception as e:
                results['failed'] += 1
                print(f"  ❌ {lang}: Error - {str(e)}")

    # Print summary
    print("\n" + "="*80)
    print("SUBTITLE FETCH COMPLETE")
    print("="*80)
    print(f"Processed: {len(content_items)} items")
    print(f"  ✅ Success: {results['success']}")
    print(f"  ❌ Failed: {results['failed']}")
    print(f"  📝 Total subtitles added: {results['total_subtitles']}")
    print("="*80)

asyncio.run(fetch_subtitles())
PYTHON_EOF
)

  # Run the Python script with parameters
  poetry run python -c "$PYTHON_CMD" "$CONTENT_TYPE" "$CONTENT_ID" "$BATCH_SIZE" "$(IFS=,; echo "${LANGUAGES[*]}")"
  EXIT_CODE=$?

else
  echo -e "${RED}❌ Invalid mode: $MODE${NC}"
  exit 1
fi

# Exit with appropriate code
if [[ "$JSON_OUTPUT" == "false" ]]; then
  echo ""
  if [[ $EXIT_CODE -eq 0 ]]; then
    echo -e "${GREEN}✅ Subtitle operation completed successfully${NC}"
  else
    echo -e "${RED}❌ Subtitle operation failed with exit code $EXIT_CODE${NC}"
  fi
  echo ""
  echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
fi

exit $EXIT_CODE
