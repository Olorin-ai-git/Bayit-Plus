#!/usr/bin/env bash
###############################################################################
# Bayit+ HLS Migration Script
#
# Migrates existing content from raw video files (MKV, AVI, MOV) to HLS format
# with browser-compatible AAC audio. This fixes the "no audio" issue caused by
# browsers not supporting AC3/DTS audio codecs.
#
# Usage:
#   ./scripts/backend/bayit-migrate-hls.sh [options]
#
# Options:
#   --dry-run            Preview what would be converted without making changes
#   --limit N            Only process N items (useful for testing)
#   --content-id ID      Process a specific content by MongoDB ObjectId
#   --local-path PATH    Local path to check for files first (default: /Volumes/USB Drive/Movies)
#   --no-local           Disable local file check, always use GCS URL
#   --verbose            Show detailed FFmpeg output
#   --help               Show this help message
#
# Examples:
#   # Preview what would be migrated
#   ./scripts/backend/bayit-migrate-hls.sh --dry-run
#
#   # Migrate first 5 items (testing)
#   ./scripts/backend/bayit-migrate-hls.sh --limit 5
#
#   # Migrate specific content
#   ./scripts/backend/bayit-migrate-hls.sh --content-id 507f1f77bcf86cd799439011
#
#   # Full migration (all content)
#   ./scripts/backend/bayit-migrate-hls.sh
#
# Requirements:
#   - FFmpeg installed with libx264 and AAC support
#   - GCS credentials configured
#   - Backend dependencies installed (poetry install)
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
DRY_RUN=false
LIMIT=""
CONTENT_ID=""
VERBOSE=false
LOCAL_PATH="/Volumes/USB Drive/Movies"

# Parse command line arguments
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
    --content-id)
      CONTENT_ID="$2"
      shift 2
      ;;
    --local-path)
      LOCAL_PATH="$2"
      shift 2
      ;;
    --no-local)
      LOCAL_PATH=""
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
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Print header
echo -e "${CYAN}"
echo "========================================================================"
echo "  Bayit+ HLS Migration Tool"
echo "  Convert raw videos to HLS with browser-compatible AAC audio"
echo "========================================================================"
echo -e "${NC}"

# Show configuration
echo -e "${BLUE}Configuration:${NC}"
echo "  Dry Run: $DRY_RUN"
[[ -n "$LIMIT" ]] && echo "  Limit: $LIMIT items"
[[ -n "$CONTENT_ID" ]] && echo "  Content ID: $CONTENT_ID"
if [[ -n "$LOCAL_PATH" ]]; then
  if [[ -d "$LOCAL_PATH" ]]; then
    echo -e "  Local Path: $LOCAL_PATH ${GREEN}(available)${NC}"
  else
    echo -e "  Local Path: $LOCAL_PATH ${YELLOW}(not found - will use GCS)${NC}"
  fi
else
  echo "  Local Path: (disabled - using GCS only)"
fi
echo "  Verbose: $VERBOSE"
echo ""

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"

# Check FFmpeg
if ! command -v ffmpeg &> /dev/null; then
  echo -e "${RED}FFmpeg is not installed${NC}"
  echo "Please install FFmpeg:"
  echo "  macOS: brew install ffmpeg"
  echo "  Ubuntu: sudo apt install ffmpeg"
  exit 1
fi
echo -e "  ${GREEN}FFmpeg installed${NC}"

# Check Poetry
if ! command -v poetry &> /dev/null; then
  echo -e "${RED}Poetry is not installed${NC}"
  echo "Please install Poetry: https://python-poetry.org/docs/#installation"
  exit 1
fi
echo -e "  ${GREEN}Poetry installed${NC}"

# Check GCS credentials
if [[ -z "${GOOGLE_APPLICATION_CREDENTIALS:-}" ]]; then
  echo -e "${YELLOW}Warning: GOOGLE_APPLICATION_CREDENTIALS not set${NC}"
  echo "  GCS operations may fail without proper credentials"
fi

echo ""

# Change to backend directory
cd "$BACKEND_DIR"

# Build Python command arguments
PYTHON_ARGS=""
[[ "$DRY_RUN" == "true" ]] && PYTHON_ARGS="$PYTHON_ARGS --dry-run"
[[ -n "$LIMIT" ]] && PYTHON_ARGS="$PYTHON_ARGS --limit $LIMIT"
[[ -n "$CONTENT_ID" ]] && PYTHON_ARGS="$PYTHON_ARGS --content-id $CONTENT_ID"
[[ -n "$LOCAL_PATH" ]] && PYTHON_ARGS="$PYTHON_ARGS --local-path \"$LOCAL_PATH\""

# Run the migration script
echo -e "${BLUE}Starting HLS migration...${NC}"
echo ""

if [[ "$VERBOSE" == "true" ]]; then
  eval poetry run python -m app.scripts.migrate_content_to_hls $PYTHON_ARGS
else
  eval poetry run python -m app.scripts.migrate_content_to_hls $PYTHON_ARGS 2>&1 | \
    grep -v "^DEBUG:" || true
fi

EXIT_CODE=${PIPESTATUS[0]}

echo ""
if [[ $EXIT_CODE -eq 0 ]]; then
  echo -e "${GREEN}HLS migration completed successfully${NC}"
else
  echo -e "${RED}HLS migration failed with exit code $EXIT_CODE${NC}"
fi

echo -e "${CYAN}========================================================================"
echo -e "${NC}"

exit $EXIT_CODE
