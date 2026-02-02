#!/bin/bash
#
# Convert movie to HLS with subtitle support
# Usage: ./scripts/convert-to-hls.sh <content_id> [--force]
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check arguments
if [ $# -lt 1 ]; then
    echo -e "${RED}Error: Content ID required${NC}"
    echo ""
    echo "Usage: $0 <content_id> [--force]"
    echo ""
    echo "Examples:"
    echo "  $0 6965398bb0b67350385e6e0b          # Convert Ice Age"
    echo "  $0 6964193ff7dfde7d50ef0a6f --force  # Force re-convert"
    exit 1
fi

CONTENT_ID=$1
FORCE_FLAG=""

if [ "$2" == "--force" ]; then
    FORCE_FLAG="--force"
fi

# Check if backend server is running
echo -e "${BLUE}Checking backend server...${NC}"
if ! curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${RED}✗ Backend server is not running!${NC}"
    echo -e "${YELLOW}Start it with: cd backend && poetry run uvicorn app.main:app --port 8000 --reload${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Backend server is running${NC}"

# Check if ffmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo -e "${RED}✗ ffmpeg is not installed!${NC}"
    echo -e "${YELLOW}Install it with: brew install ffmpeg${NC}"
    exit 1
fi

# Check if gsutil is installed
if ! command -v gsutil &> /dev/null; then
    echo -e "${RED}✗ gsutil is not installed!${NC}"
    echo -e "${YELLOW}Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install${NC}"
    exit 1
fi

# Run the conversion
echo -e "${BLUE}Starting HLS conversion...${NC}"
echo ""

cd "$BACKEND_DIR"
poetry run python scripts/convert_to_hls_with_subtitles.py "$CONTENT_ID" $FORCE_FLAG

echo ""
echo -e "${GREEN}Done!${NC}"
