#!/usr/bin/env bash
###############################################################################
# Bayit+ Podcast RSS Sync
#
# Fetches latest episodes from all active podcast RSS feeds and adds them
# to the database. Prevents duplicates by checking episode GUIDs.
#
# Usage:
#   ./scripts/backend/sync-podcasts.sh [options]
#
# Options:
#   --max-episodes N  Maximum episodes per podcast (default: 20)
#   --api-url URL     Backend API URL (default: http://localhost:8000)
#   --json            Output results in JSON format
#   --help            Show this help message
#
# Examples:
#   # Sync all podcasts with default settings
#   ./scripts/backend/sync-podcasts.sh
#
#   # Sync with custom episode limit
#   ./scripts/backend/sync-podcasts.sh --max-episodes 50
#
#   # Sync with production API
#   ./scripts/backend/sync-podcasts.sh --api-url https://api.bayit.live
#
#   # JSON output for parsing
#   ./scripts/backend/sync-podcasts.sh --json
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

# Default options
MAX_EPISODES=20
API_URL="${API_URL:-http://localhost:8000}"
JSON_OUTPUT=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --max-episodes)
      MAX_EPISODES="$2"
      shift 2
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
  echo -e "${CYAN}║  Bayit+ Podcast RSS Sync                                      ║${NC}"
  echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
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
  echo -e "${BLUE}📻 Syncing podcast RSS feeds...${NC}"
  echo "   API URL: $API_URL"
  echo "   Max Episodes per Podcast: $MAX_EPISODES"
  echo ""
fi

# Trigger podcast sync
RESPONSE=$(curl -sf -X POST "$API_URL/api/v1/podcasts/sync" \
  -H "Content-Type: application/json" || echo '{"status":"error","message":"Request failed"}')

# Parse response
STATUS=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('status', 'unknown'))" 2>/dev/null || echo "error")

if [[ "$JSON_OUTPUT" == "true" ]]; then
  echo "$RESPONSE"
else
  if [[ "$STATUS" == "success" ]]; then
    TOTAL=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('total_podcasts', 0))")
    SYNCED=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('podcasts_synced', 0))")
    EPISODES=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('total_episodes_added', 0))")

    echo -e "${GREEN}✅ Podcast sync completed successfully${NC}"
    echo ""
    echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}SUMMARY${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "📚 Total podcasts with RSS feeds: ${YELLOW}$TOTAL${NC}"
    echo -e "✔️  Podcasts with new episodes: ${GREEN}$SYNCED${NC}"
    echo -e "📝 Total episodes added: ${GREEN}$EPISODES${NC}"
    echo ""
    echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"

    if [[ "$EPISODES" -eq 0 ]]; then
      echo ""
      echo -e "${YELLOW}ℹ️  No new episodes found. All podcasts are up to date.${NC}"
    fi
  else
    MESSAGE=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('message', 'Unknown error'))" 2>/dev/null || echo "Failed to parse response")
    echo -e "${RED}❌ Podcast sync failed${NC}"
    echo "   Error: $MESSAGE"
    exit 1
  fi
fi

echo ""
exit 0
