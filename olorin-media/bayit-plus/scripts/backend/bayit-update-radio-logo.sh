#!/usr/bin/env bash
###############################################################################
# Bayit+ Radio Station Logo Update Script
#
# Updates radio station logo with a URL or data URI
#
# Usage:
#   ./scripts/backend/bayit-update-radio-logo.sh [options]
#
# Options:
#   --station-id ID       Radio station ID (required)
#   --station-name NAME   Radio station name (alternative to ID)
#   --logo-url URL        Logo image URL
#   --logo-file FILE      Local logo file path (will be converted to data URI)
#   --help                Show this help message
#
# Examples:
#   # Update by station name with URL
#   ./scripts/backend/bayit-update-radio-logo.sh --station-name "103FM" --logo-url "https://example.com/logo.png"
#
#   # Update by station ID with local file
#   ./scripts/backend/bayit-update-radio-logo.sh --station-id "6963bff4abb3ca055cdd84ae" --logo-file "./logos/103fm.svg"
#
###############################################################################

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"

# Default options
STATION_ID=""
STATION_NAME=""
LOGO_URL=""
LOGO_FILE=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --station-id)
      STATION_ID="$2"
      shift 2
      ;;
    --station-name)
      STATION_NAME="$2"
      shift 2
      ;;
    --logo-url)
      LOGO_URL="$2"
      shift 2
      ;;
    --logo-file)
      LOGO_FILE="$2"
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

# Validate inputs
if [[ -z "$STATION_ID" && -z "$STATION_NAME" ]]; then
  echo -e "${RED}❌ Either --station-id or --station-name is required${NC}"
  exit 1
fi

if [[ -z "$LOGO_URL" && -z "$LOGO_FILE" ]]; then
  echo -e "${RED}❌ Either --logo-url or --logo-file is required${NC}"
  exit 1
fi

if [[ -n "$LOGO_FILE" && ! -f "$LOGO_FILE" ]]; then
  echo -e "${RED}❌ Logo file not found: $LOGO_FILE${NC}"
  exit 1
fi

echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  Bayit+ Radio Station Logo Update                            ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Configuration:${NC}"
[[ -n "$STATION_ID" ]] && echo "  Station ID: $STATION_ID"
[[ -n "$STATION_NAME" ]] && echo "  Station Name: $STATION_NAME"
[[ -n "$LOGO_URL" ]] && echo "  Logo URL: $LOGO_URL"
[[ -n "$LOGO_FILE" ]] && echo "  Logo File: $LOGO_FILE"
echo ""

cd "$BACKEND_DIR"

# Run update
PYTHON_CMD=$(cat <<'PYTHON_EOF'
import asyncio
import sys
import base64
from pathlib import Path
from app.core.database import connect_to_mongo
from app.models.content import RadioStation

async def update_radio_logo(
    station_id: str,
    station_name: str,
    logo_url: str,
    logo_file: str
):
    await connect_to_mongo()

    # Find the station
    if station_id:
        station = await RadioStation.get(station_id)
        if not station:
            print(f"❌ Station not found with ID: {station_id}")
            return False
    elif station_name:
        stations = await RadioStation.find({"name": station_name}).to_list(length=1)
        if not stations:
            print(f"❌ Station not found with name: {station_name}")
            return False
        station = stations[0]
    else:
        print("❌ No station identifier provided")
        return False

    print(f"📻 Found station: {station.name}")
    print(f"   ID: {station.id}")
    print(f"   Current logo: {station.logo or '(none)'}")
    print("")

    # Determine logo value
    logo_value = None
    if logo_url:
        logo_value = logo_url
        print(f"🔗 Using logo URL: {logo_url}")
    elif logo_file:
        # Read file and convert to data URI
        file_path = Path(logo_file)

        # Determine MIME type based on extension
        mime_types = {
            '.svg': 'image/svg+xml',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.webp': 'image/webp'
        }

        ext = file_path.suffix.lower()
        mime_type = mime_types.get(ext, 'application/octet-stream')

        # Read file
        with open(file_path, 'rb') as f:
            file_data = f.read()

        # Create data URI
        encoded = base64.b64encode(file_data).decode('utf-8')
        logo_value = f"data:{mime_type};base64,{encoded}"

        print(f"📁 Converted file to data URI")
        print(f"   File: {file_path.name}")
        print(f"   Type: {mime_type}")
        print(f"   Size: {len(file_data)} bytes → {len(logo_value)} chars")
        print("")

    # Update station
    station.logo = logo_value
    await station.save()

    print("✅ Logo updated successfully!")
    print(f"   New logo: {logo_value[:100]}..." if len(logo_value) > 100 else f"   New logo: {logo_value}")

    return True

# Entry point
station_id = sys.argv[1] if sys.argv[1] != "" else None
station_name = sys.argv[2] if sys.argv[2] != "" else None
logo_url = sys.argv[3] if sys.argv[3] != "" else None
logo_file = sys.argv[4] if sys.argv[4] != "" else None

result = asyncio.run(update_radio_logo(station_id, station_name, logo_url, logo_file))
sys.exit(0 if result else 1)
PYTHON_EOF
)

poetry run python -c "$PYTHON_CMD" "$STATION_ID" "$STATION_NAME" "$LOGO_URL" "$LOGO_FILE"

echo ""
echo -e "${GREEN}✅ Radio logo update completed${NC}"
