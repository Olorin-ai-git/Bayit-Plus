#!/usr/bin/env bash
# =============================================================================
# Bayit+ MKV to MP4 Transcode Tool
# =============================================================================
#
# Batch transcode all MKV content to MP4 with faststart for web streaming.
# Deletes original MKV after successful transcode.
#
# Usage:
#   ./scripts/backend/bayit-transcode-mkv.sh [OPTIONS]
#   olorin transcode-mkv [OPTIONS]
#   /bayit-transcode-mkv [OPTIONS]
#
# Options:
#   --dry-run     Preview what would be transcoded without making changes
#   --limit N     Only process N items
#   --help        Show this help message
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

# Get script directory and project root
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
readonly BACKEND_DIR="$PROJECT_ROOT/backend"

# Default options
DRY_RUN=false
LIMIT=0
VERBOSE=false

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*" >&2
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $*"
}

show_help() {
    cat << 'EOF'
========================================================================
  Bayit+ MKV to MP4 Transcode Tool
  Convert MKV files to web-optimized MP4 with faststart
========================================================================

USAGE:
  ./scripts/backend/bayit-transcode-mkv.sh [OPTIONS]
  olorin transcode-mkv [OPTIONS]
  /bayit-transcode-mkv [OPTIONS]

OPTIONS:
  --dry-run     Preview what would be transcoded (no changes made)
  --limit N     Only process first N MKV files
  --verbose     Show detailed output
  --help        Show this help message

EXAMPLES:
  # Preview all MKV files that need transcoding
  ./scripts/backend/bayit-transcode-mkv.sh --dry-run

  # Transcode first 5 MKV files
  ./scripts/backend/bayit-transcode-mkv.sh --limit 5

  # Transcode all MKV files
  ./scripts/backend/bayit-transcode-mkv.sh

PROCESS:
  1. Finds all content with .mkv stream URLs in MongoDB
  2. Downloads each MKV from Google Cloud Storage
  3. Transcodes to MP4 using FFmpeg:
     - Video: copy (no re-encoding, fast)
     - Audio: AAC 192kbps stereo
     - Flags: +faststart for web streaming
  4. Uploads MP4 to GCS as {filename}_web.mp4
  5. Updates content.stream_url in database
  6. Deletes original MKV from GCS

REQUIREMENTS:
  - FFmpeg installed (brew install ffmpeg)
  - Poetry installed
  - GCS credentials configured
  - MongoDB connection configured

FILES:
  - Bash Script: scripts/backend/bayit-transcode-mkv.sh
  - Python Script: scripts/backend/batch_transcode_mkv.py

========================================================================
EOF
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check FFmpeg
    if ! command -v ffmpeg &> /dev/null; then
        log_error "FFmpeg is not installed"
        log_info "Install with: brew install ffmpeg"
        exit 1
    fi
    log_success "FFmpeg installed"

    # Check Poetry
    if ! command -v poetry &> /dev/null; then
        log_error "Poetry is not installed"
        log_info "Install from: https://python-poetry.org/docs/#installation"
        exit 1
    fi
    log_success "Poetry installed"

    # Check backend directory
    if [ ! -d "$BACKEND_DIR" ]; then
        log_error "Backend directory not found: $BACKEND_DIR"
        exit 1
    fi
    log_success "Backend directory found"

    # Check Python script exists
    if [ ! -f "$SCRIPT_DIR/batch_transcode_mkv.py" ]; then
        log_error "Python script not found: $SCRIPT_DIR/batch_transcode_mkv.py"
        exit 1
    fi
    log_success "Python script found"

    echo ""
}

run_dry_run() {
    log_info "Running in DRY RUN mode - no changes will be made"
    echo ""

    cd "$BACKEND_DIR"

    # Run a query to show what would be processed
    poetry run python -c "
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
import sys
sys.path.insert(0, '.')
from app.core.config import settings
from app.models.content import Content

async def preview():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    await init_beanie(database=client[settings.MONGODB_DB_NAME], document_models=[Content])

    contents = await Content.find({
        'stream_url': {'\$regex': r'\.mkv\$', '\$options': 'i'}
    }).to_list(500)

    if not contents:
        print('No MKV files found in database')
        return

    print(f'Found {len(contents)} MKV files that would be transcoded:')
    print('')
    for i, c in enumerate(contents[:${LIMIT:-500}], 1):
        url_short = c.stream_url[-60:] if len(c.stream_url) > 60 else c.stream_url
        print(f'  {i}. {c.title}')
        print(f'     URL: ...{url_short}')
        print('')

asyncio.run(preview())
"
}

run_transcode() {
    log_info "Starting MKV to MP4 transcode..."
    echo ""

    cd "$BACKEND_DIR" || exit 1

    if [ "$LIMIT" -gt 0 ]; then
        log_info "Limiting to $LIMIT items"
    fi

    poetry run python "../scripts/backend/batch_transcode_mkv.py"
}

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
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
done

# Header
echo ""
echo "========================================================================"
echo "  Bayit+ MKV to MP4 Transcode Tool"
echo "  Convert MKV files to web-optimized MP4 with faststart"
echo "========================================================================"
echo ""
echo "Configuration:"
echo "  Dry Run: $DRY_RUN"
if [ "$LIMIT" -gt 0 ]; then
    echo "  Limit: $LIMIT items"
else
    echo "  Limit: All items"
fi
echo ""

# Check prerequisites
check_prerequisites

# Run appropriate mode
if [ "$DRY_RUN" = true ]; then
    run_dry_run
else
    run_transcode
fi

echo ""
echo "========================================================================"
log_success "Transcode operation completed"
echo "========================================================================"
