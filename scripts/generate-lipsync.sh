#!/usr/bin/env bash
# =============================================================================
# Bayit+ Lip-Sync Generator
# =============================================================================
#
# Generate lip-synced videos from a still image + audio (or text via TTS).
# Wraps the Aurora fal.ai pipeline exposed by generate_lipsync.py.
#
# Usage:
#   generate-lipsync.sh --image <path> --audio <path>
#   generate-lipsync.sh --image <path> --text "Hello" [--voice-id <id>]
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

usage() {
    echo -e "${BLUE}Bayit+ Lip-Sync Generator${NC}"
    echo ""
    echo "Usage:"
    echo "  $(basename "$0") --image <path> --audio <path> [options]"
    echo "  $(basename "$0") --image <path> --text \"speech\" [options]"
    echo ""
    echo "Required:"
    echo "  --image <path>       Path or URL to the face image"
    echo "  --audio <path>       Path or URL to the audio file"
    echo "  --text  <string>     Text to synthesize via ElevenLabs TTS"
    echo ""
    echo "Optional:"
    echo "  --voice-id <id>      ElevenLabs voice ID (default: config value)"
    echo "  --resolution <res>   Output resolution: 480p or 720p (default: config value)"
    echo "  --output <path>      Custom output file path"
    echo "  --open               Open the resulting video after generation"
    echo "  --help               Show this help message"
    echo ""
    echo "Examples:"
    echo "  $(basename "$0") --image photo.jpg --audio speech.mp3 --open"
    echo "  $(basename "$0") --image photo.jpg --text \"Hey there\" --voice-id abc123"
    exit 0
}

if [ $# -eq 0 ]; then
    usage
fi

# Save original args before validation consumes them
ORIG_ARGS=("$@")

HAS_IMAGE=false
HAS_AUDIO=false
HAS_TEXT=false

while [ $# -gt 0 ]; do
    case "$1" in
        --help|-h) usage ;;
        --image) HAS_IMAGE=true; shift 2 ;;
        --audio) HAS_AUDIO=true; shift 2 ;;
        --text)  HAS_TEXT=true;  shift 2 ;;
        --open)  shift ;;
        *)       shift 2 ;;
    esac
done

if [ "$HAS_IMAGE" = false ]; then
    echo -e "${RED}Error: --image is required${NC}" >&2
    exit 1
fi

if [ "$HAS_AUDIO" = false ] && [ "$HAS_TEXT" = false ]; then
    echo -e "${RED}Error: either --audio or --text is required${NC}" >&2
    exit 1
fi

echo -e "${GREEN}Starting lip-sync generation...${NC}"
cd "$PROJECT_ROOT/backend"
poetry run python "$SCRIPT_DIR/generate_lipsync.py" "${ORIG_ARGS[@]}"
