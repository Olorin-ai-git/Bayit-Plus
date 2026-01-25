#!/usr/bin/env bash
###############################################################################
# Bayit+ Podcast Translation Script
#
# Translates podcast episodes using AI-powered vocal separation and dubbing:
# 1. Separates vocals from background music (Demucs AI model)
# 2. Transcribes vocals to text (Whisper STT)
# 3. Translates text (Hebrew ↔ English bidirectional)
# 4. Generates translated voice (ElevenLabs TTS)
# 5. Mixes translated vocals with original background music
# 6. Uploads final mixed audio to storage
#
# Usage:
#   ./scripts/backend/translate-podcast.sh [options]
#
# Options:
#   --podcast-id ID      Translate all episodes of specific podcast (MongoDB ObjectId)
#   --episode-id ID      Translate specific episode only (MongoDB ObjectId)
#   --batch-size N       Process N episodes at a time (default: 10)
#   --retry-failed       Retry previously failed translations
#   --force              Force re-translate already completed episodes
#   --api-url URL        Backend API URL (default: http://localhost:8000)
#   --json               Output results in JSON format
#   --help               Show this help message
#
# Examples:
#   # Translate all pending episodes (auto-discovery)
#   ./scripts/backend/translate-podcast.sh
#
#   # Translate specific podcast
#   ./scripts/backend/translate-podcast.sh --podcast-id 507f1f77bcf86cd799439011
#
#   # Translate single episode
#   ./scripts/backend/translate-podcast.sh --episode-id 507f191e810c19729de860ea
#
#   # Retry failed translations
#   ./scripts/backend/translate-podcast.sh --retry-failed
#
#   # Force re-translate specific podcast
#   ./scripts/backend/translate-podcast.sh --podcast-id 507f1f77bcf86cd799439011 --force
#
###############################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"

# Default options
PODCAST_ID=""
EPISODE_ID=""
BATCH_SIZE=10
RETRY_FAILED=false
FORCE=false
API_URL="${API_URL:-http://localhost:8000}"
JSON_OUTPUT=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --podcast-id)
      PODCAST_ID="$2"
      shift 2
      ;;
    --episode-id)
      EPISODE_ID="$2"
      shift 2
      ;;
    --batch-size)
      BATCH_SIZE="$2"
      shift 2
      ;;
    --retry-failed)
      RETRY_FAILED=true
      shift
      ;;
    --force)
      FORCE=true
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

# Print header (unless JSON mode)
if [[ "$JSON_OUTPUT" == "false" ]]; then
  echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║  Bayit+ Podcast Translation                                   ║${NC}"
  echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "${BLUE}Configuration:${NC}"
  [[ -n "$PODCAST_ID" ]] && echo "  Podcast ID: $PODCAST_ID"
  [[ -n "$EPISODE_ID" ]] && echo "  Episode ID: $EPISODE_ID"
  echo "  Batch Size: $BATCH_SIZE"
  echo "  Retry Failed: $RETRY_FAILED"
  echo "  Force: $FORCE"
  echo "  API URL: $API_URL"
  echo ""
fi

# Check if server is running
if [[ "$JSON_OUTPUT" == "false" ]]; then
  echo -e "${BLUE}🔍 Checking server health...${NC}"
fi

if ! curl -sf "$API_URL/health" > /dev/null 2>&1; then
  if [[ "$JSON_OUTPUT" == "false" ]]; then
    echo -e "${RED}❌ Server is not running at $API_URL${NC}"
    echo "Please start the backend server first:"
    echo "  cd backend && poetry run uvicorn app.main:app --reload"
  else
    echo '{"error": "Server not running", "api_url": "'$API_URL'"}'
  fi
  exit 1
fi

if [[ "$JSON_OUTPUT" == "false" ]]; then
  echo -e "${GREEN}✅ Server is healthy${NC}"
  echo ""
fi

# Get admin authentication
if [[ "$JSON_OUTPUT" == "false" ]]; then
  echo -e "${BLUE}🔐 Authenticating...${NC}"
fi

# Check for required environment variables
if [[ -z "${ADMIN_EMAIL:-}" ]] || [[ -z "${ADMIN_PASSWORD:-}" ]]; then
  # Try to load from .env
  if [[ -f "$BACKEND_DIR/.env" ]]; then
    export $(grep -E "^ADMIN_EMAIL=" "$BACKEND_DIR/.env" | xargs)
    export $(grep -E "^ADMIN_PASSWORD=" "$BACKEND_DIR/.env" | xargs)
  fi
fi

if [[ -z "${ADMIN_EMAIL:-}" ]] || [[ -z "${ADMIN_PASSWORD:-}" ]]; then
  if [[ "$JSON_OUTPUT" == "false" ]]; then
    echo -e "${RED}❌ Admin credentials not found${NC}"
    echo "Please set ADMIN_EMAIL and ADMIN_PASSWORD environment variables"
  else
    echo '{"error": "Admin credentials not found"}'
  fi
  exit 1
fi

# Create temp file for JSON payload
TMPFILE=$(mktemp)
cat > "$TMPFILE" << EOF
{"email":"$ADMIN_EMAIL","password":"$ADMIN_PASSWORD"}
EOF

TOKEN_RESPONSE=$(curl -sf -X POST "$API_URL/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d @"$TMPFILE")
rm -f "$TMPFILE"

TOKEN=$(echo "$TOKEN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('access_token', ''))" 2>/dev/null || echo "")

if [[ -z "$TOKEN" ]]; then
  if [[ "$JSON_OUTPUT" == "false" ]]; then
    echo -e "${RED}❌ Authentication failed${NC}"
  else
    echo '{"error": "Authentication failed"}'
  fi
  exit 1
fi

if [[ "$JSON_OUTPUT" == "false" ]]; then
  echo -e "${GREEN}✅ Authenticated${NC}"
  echo ""
fi

# Determine translation mode and execute
if [[ -n "$EPISODE_ID" ]]; then
  # Single episode translation
  if [[ "$JSON_OUTPUT" == "false" ]]; then
    echo -e "${MAGENTA}🎙️  Translating single episode...${NC}"
    echo "   Episode ID: $EPISODE_ID"
    echo ""
  fi

  # Get podcast ID for the episode first
  EPISODE_DATA=$(curl -sf -H "Authorization: Bearer $TOKEN" \
    "$API_URL/api/v1/admin/podcast-episodes/$EPISODE_ID" || echo '{}')

  PODCAST_ID_FOR_EP=$(echo "$EPISODE_DATA" | python3 -c "import sys, json; print(json.load(sys.stdin).get('podcast_id', ''))" 2>/dev/null || echo "")

  if [[ -z "$PODCAST_ID_FOR_EP" ]]; then
    echo -e "${RED}❌ Episode not found${NC}"
    exit 1
  fi

  # Trigger translation
  RESPONSE=$(curl -sf -X POST \
    "$API_URL/api/v1/admin/podcasts/$PODCAST_ID_FOR_EP/episodes/$EPISODE_ID/translate" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" || echo '{"status":"error"}')

  if [[ "$JSON_OUTPUT" == "true" ]]; then
    echo "$RESPONSE"
  else
    STATUS=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('status', 'error'))")
    if [[ "$STATUS" == "success" || "$STATUS" == "queued" ]]; then
      echo -e "${GREEN}✅ Translation queued successfully${NC}"
      MESSAGE=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('message', ''))")
      echo "$MESSAGE"
    else
      echo -e "${RED}❌ Translation failed${NC}"
      echo "$RESPONSE"
      exit 1
    fi
  fi

elif [[ -n "$PODCAST_ID" ]]; then
  # Bulk podcast translation
  if [[ "$JSON_OUTPUT" == "false" ]]; then
    echo -e "${MAGENTA}🎙️  Translating all episodes of podcast...${NC}"
    echo "   Podcast ID: $PODCAST_ID"
    echo ""
  fi

  # Trigger bulk translation
  RESPONSE=$(curl -sf -X POST \
    "$API_URL/api/v1/admin/podcasts/$PODCAST_ID/translate-all" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" || echo '{"status":"error"}')

  if [[ "$JSON_OUTPUT" == "true" ]]; then
    echo "$RESPONSE"
  else
    STATUS=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('status', 'error'))")
    if [[ "$STATUS" == "success" || "$STATUS" == "queued" ]]; then
      echo -e "${GREEN}✅ Bulk translation queued successfully${NC}"
      QUEUED=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('episodes_queued', 0))")
      echo "   Episodes queued: $QUEUED"
    else
      echo -e "${RED}❌ Translation failed${NC}"
      echo "$RESPONSE"
      exit 1
    fi
  fi

else
  # Auto-discovery: Find and translate pending/failed episodes
  if [[ "$JSON_OUTPUT" == "false" ]]; then
    echo -e "${MAGENTA}🎙️  Auto-discovering episodes to translate...${NC}"
    echo ""
  fi

  # Use Python to find and queue episodes
  cd "$BACKEND_DIR"

  PYTHON_CMD=$(cat <<'PYTHON_EOF'
import asyncio
import sys
from app.core.database import connect_to_mongo
from app.models.content import PodcastEpisode

async def find_and_queue():
    await connect_to_mongo()

    retry_failed = sys.argv[1] == 'true'
    batch_size = int(sys.argv[2])

    # Build query
    if retry_failed:
        query = {'translation_status': {'$in': ['pending', 'failed']}}
    else:
        query = {'translation_status': 'pending'}

    episodes = await PodcastEpisode.find(query).limit(batch_size).to_list()

    print(f"Found {len(episodes)} episodes to translate")

    for ep in episodes:
        print(f"  - {ep.title} ({ep.podcast_id})")

    return len(episodes)

result = asyncio.run(find_and_queue())
sys.exit(0 if result > 0 else 1)
PYTHON_EOF
)

  poetry run python -c "$PYTHON_CMD" "$RETRY_FAILED" "$BATCH_SIZE"
  EXIT_CODE=$?

  if [[ $EXIT_CODE -ne 0 ]]; then
    if [[ "$JSON_OUTPUT" == "false" ]]; then
      echo ""
      echo -e "${YELLOW}ℹ️  No episodes found to translate${NC}"
      echo "All episodes are already translated or no pending translations found"
    fi
    exit 0
  fi

  echo ""
  echo -e "${BLUE}Background translation worker will process these episodes${NC}"
  echo "Check status with: /podcast-sync"
fi

if [[ "$JSON_OUTPUT" == "false" ]]; then
  echo ""
  echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
  echo -e "${GREEN}✅ Translation operation completed${NC}"
  echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
fi

exit 0
