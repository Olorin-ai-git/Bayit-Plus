#!/bin/bash
# Monitor tvOS review and create iOS 1.0.1 when tvOS is approved
# Usage: monitor-tvos-create-ios.sh [interval-seconds]
#
# Polls the tvOS 1.0 version state. Once approved (READY_FOR_SALE),
# creates iOS 1.0.1 and optionally submits subscriptions.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ASC="$SCRIPT_DIR/asc-api.sh"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'

BAYIT_APP_ID="6758416345"
TVOS_VERSION_ID="911d445f-582c-4874-a798-553ef8213466"
IOS_VERSION="1.0.1"
INTERVAL="${1:-300}"

echo -e "${BLUE}Monitoring tvOS review (every ${INTERVAL}s)${NC}"
echo -e "${BLUE}Will create iOS ${IOS_VERSION} once tvOS is approved${NC}"
echo ""

while true; do
  STATE=$("$ASC" raw GET "/appStoreVersions/${TVOS_VERSION_ID}?fields[appStoreVersions]=appStoreState" 2>/dev/null | \
    python3 -c "import sys,json; print(json.load(sys.stdin)['data']['attributes']['appStoreState'])" 2>/dev/null || echo "ERROR")
  TS=$(date '+%Y-%m-%d %H:%M:%S')

  case "$STATE" in
    READY_FOR_SALE)
      echo -e "${GREEN}[${TS}] tvOS APPROVED${NC}"

      # Check subscription states
      echo -e "${BLUE}Checking subscription states...${NC}"
      "$ASC" sub-state "$BAYIT_APP_ID"

      # Create iOS 1.0.1
      echo -e "${BLUE}Creating iOS ${IOS_VERSION}...${NC}"
      "$ASC" create-version "$BAYIT_APP_ID" IOS "$IOS_VERSION"

      if [ $? -eq 0 ]; then
        echo -e "${GREEN}iOS ${IOS_VERSION} created successfully${NC}"
        echo ""
        echo -e "${YELLOW}Next steps:${NC}"
        echo -e "  1. Upload a build for iOS ${IOS_VERSION}"
        echo -e "     cd ios-app && ./scripts/promote-ios.sh ${IOS_VERSION}"
        echo -e "  2. Submit for review:"
        echo -e "     $ASC submit-review $BAYIT_APP_ID IOS"
        echo ""
        echo -e "  Or if subscriptions need resubmitting:"
        echo -e "     $ASC submit-subscription 6760296545  # Monthly"
        echo -e "     $ASC submit-subscription 6760296725  # Yearly"
      else
        echo -e "${RED}Failed to create iOS ${IOS_VERSION}${NC}"
      fi
      exit 0
      ;;
    WAITING_FOR_REVIEW)
      echo -e "${YELLOW}[${TS}] WAITING_FOR_REVIEW${NC}"
      ;;
    IN_REVIEW)
      echo -e "${BLUE}[${TS}] IN_REVIEW${NC}"
      ;;
    PROCESSING_FOR_APP_STORE)
      echo -e "${BLUE}[${TS}] PROCESSING_FOR_APP_STORE${NC}"
      ;;
    REJECTED|METADATA_REJECTED|INVALID_BINARY)
      echo -e "${RED}[${TS}] ${STATE} - tvOS was rejected${NC}"
      echo -e "${RED}Check App Store Connect for rejection details${NC}"
      exit 1
      ;;
    DEVELOPER_REJECTED)
      echo -e "${RED}[${TS}] DEVELOPER_REJECTED - tvOS not submitted${NC}"
      echo -e "${RED}Submit tvOS for review first: $ASC submit-review $BAYIT_APP_ID TV_OS${NC}"
      exit 1
      ;;
    ERROR)
      echo -e "${RED}[${TS}] Failed to fetch state (network/auth error)${NC}"
      ;;
    *)
      echo -e "[${TS}] ${STATE}"
      ;;
  esac

  sleep "$INTERVAL"
done
