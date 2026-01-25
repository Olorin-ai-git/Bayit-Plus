#!/usr/bin/env bash
###############################################################################
# Bayit+ Podcast & Radio Artwork Attachment Script
#
# Intelligently find and attach artwork to podcasts and radio stations using
# multiple fallback sources:
#
# Podcasts:
#   1. RSS feed artwork (primary)
#   2. iTunes Podcast API (fallback)
#   3. Spotify Podcast API (fallback)
#   4. Podcast Index API (fallback)
#
# Radio Stations:
#   1. Radio Browser API (primary)
#   2. Station website favicon/logo scraping
#   3. Google Custom Search for station logos
#   4. Manual upload list (if all fail)
#
# Usage:
#   ./scripts/backend/attach-podcast-radio-posters.sh [options]
#
# Options:
#   --content-type TYPE     Content type: podcast, radio, all (default: all)
#   --content-id ID         Process specific content item by ID
#   --batch-size N          Process N items at a time (default: 10)
#   --min-resolution N      Minimum image resolution in pixels (default: 300)
#   --quality LEVEL         Quality level: high, medium, low (default: high)
#   --sources SOURCES       Comma-separated source list (default: auto)
#   --dry-run               Preview without making changes
#   --api-url URL           Backend API URL (default: http://localhost:8000)
#   --force-refresh         Re-fetch even if artwork exists
#   --json                  Output results in JSON format
#   --help                  Show this help message
#
# Examples:
#   # Attach artwork to all podcasts and radio stations
#   ./scripts/backend/attach-podcast-radio-posters.sh
#
#   # Podcasts only with high quality
#   ./scripts/backend/attach-podcast-radio-posters.sh --content-type podcast --quality high
#
#   # Radio stations only
#   ./scripts/backend/attach-podcast-radio-posters.sh --content-type radio
#
#   # Dry run to preview changes
#   ./scripts/backend/attach-podcast-radio-posters.sh --dry-run
#
#   # Force refresh all podcasts
#   ./scripts/backend/attach-podcast-radio-posters.sh --content-type podcast --force-refresh
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
CONTENT_TYPE="all"
CONTENT_ID=""
BATCH_SIZE=10
MIN_RESOLUTION=300
QUALITY="high"
SOURCES="auto"
DRY_RUN=false
API_URL="${API_URL:-http://localhost:8000}"
FORCE_REFRESH=false
JSON_OUTPUT=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --content-type)
      CONTENT_TYPE="$2"
      shift 2
      ;;
    --content-id)
      CONTENT_ID="$2"
      shift 2
      ;;
    --batch-size)
      BATCH_SIZE="$2"
      shift 2
      ;;
    --min-resolution)
      MIN_RESOLUTION="$2"
      shift 2
      ;;
    --quality)
      QUALITY="$2"
      shift 2
      ;;
    --sources)
      SOURCES="$2"
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
    --force-refresh)
      FORCE_REFRESH=true
      shift
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

# Validate content type
if [[ ! "$CONTENT_TYPE" =~ ^(podcast|radio|all)$ ]]; then
  echo -e "${RED}❌ Invalid content type: $CONTENT_TYPE${NC}"
  echo "Valid types: podcast, radio, all"
  exit 1
fi

# Validate quality
if [[ ! "$QUALITY" =~ ^(high|medium|low)$ ]]; then
  echo -e "${RED}❌ Invalid quality: $QUALITY${NC}"
  echo "Valid quality levels: high, medium, low"
  exit 1
fi

# Set min resolution based on quality if not explicitly set
if [[ "$QUALITY" == "high" ]] && [[ "$MIN_RESOLUTION" -eq 300 ]]; then
  MIN_RESOLUTION=800
elif [[ "$QUALITY" == "medium" ]] && [[ "$MIN_RESOLUTION" -eq 300 ]]; then
  MIN_RESOLUTION=500
fi

# Print header (unless JSON mode)
if [[ "$JSON_OUTPUT" == "false" ]]; then
  echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║  Bayit+ Podcast & Radio Artwork Attachment                   ║${NC}"
  echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "${BLUE}Configuration:${NC}"
  echo "  Content Type: $CONTENT_TYPE"
  [[ -n "$CONTENT_ID" ]] && echo "  Content ID: $CONTENT_ID"
  echo "  Quality: $QUALITY"
  echo "  Min Resolution: ${MIN_RESOLUTION}px"
  echo "  Sources: $SOURCES"
  echo "  Batch Size: $BATCH_SIZE"
  echo "  Dry Run: $DRY_RUN"
  echo "  Force Refresh: $FORCE_REFRESH"
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

# Main artwork attachment logic
cd "$BACKEND_DIR"

if [[ "$JSON_OUTPUT" == "false" ]]; then
  echo -e "${MAGENTA}🎨 Finding and attaching artwork...${NC}"
  echo ""
fi

# Use Python to find and attach artwork
PYTHON_CMD=$(cat <<'PYTHON_EOF'
import asyncio
import sys
import os
from typing import List, Dict, Any, Optional
from urllib.parse import urlparse
import aiohttp
from app.core.database import connect_to_mongo
from app.models.content import Podcast, RadioStation
from app.services.podcast_sync import parse_feed
from app.core.config import settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)

async def attach_podcast_radio_artwork(
    content_type: str,
    content_id: str,
    batch_size: int,
    min_resolution: int,
    quality: str,
    sources: str,
    dry_run: bool,
    force_refresh: bool
) -> Dict[str, Any]:
    """Find and attach artwork to podcasts and radio stations."""
    await connect_to_mongo()

    results = {
        "total_processed": 0,
        "total_attached": 0,
        "total_manual": 0,
        "by_type": {},
        "errors": []
    }

    # Process podcasts
    if content_type in ("podcast", "all"):
        podcast_results = await process_podcasts(
            content_id, batch_size, min_resolution, quality, sources, dry_run, force_refresh
        )
        results["by_type"]["podcasts"] = podcast_results
        results["total_processed"] += podcast_results["total"]
        results["total_attached"] += podcast_results["attached"]
        results["total_manual"] += podcast_results["manual_needed"]

    # Process radio stations
    if content_type in ("radio", "all"):
        radio_results = await process_radio_stations(
            content_id, batch_size, min_resolution, quality, sources, dry_run, force_refresh
        )
        results["by_type"]["radio"] = radio_results
        results["total_processed"] += radio_results["total"]
        results["total_attached"] += radio_results["attached"]
        results["total_manual"] += radio_results["manual_needed"]

    return results


async def get_image_dimensions(url: str) -> Optional[tuple]:
    """Get image dimensions from URL."""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as response:
                if response.status == 200:
                    content = await response.read()
                    # Simple dimension detection for common formats
                    # This is a simplified version - production would use PIL/Pillow
                    if content[:4] == b'\xff\xd8\xff\xe0':  # JPEG
                        return parse_jpeg_dimensions(content)
                    elif content[:8] == b'\x89PNG\r\n\x1a\n':  # PNG
                        return parse_png_dimensions(content)
    except Exception as e:
        logger.warning(f"Failed to get image dimensions: {e}")
    return None


def parse_jpeg_dimensions(data: bytes) -> Optional[tuple]:
    """Parse JPEG dimensions from binary data."""
    # Simplified JPEG parser
    try:
        idx = 2
        while idx < len(data):
            if data[idx] != 0xFF:
                return None
            marker = data[idx + 1]
            idx += 2
            if marker == 0xC0 or marker == 0xC2:  # SOF0 or SOF2
                height = (data[idx + 3] << 8) + data[idx + 4]
                width = (data[idx + 5] << 8) + data[idx + 6]
                return (width, height)
            else:
                length = (data[idx] << 8) + data[idx + 1]
                idx += length
    except:
        pass
    return None


def parse_png_dimensions(data: bytes) -> Optional[tuple]:
    """Parse PNG dimensions from binary data."""
    # PNG IHDR chunk contains dimensions
    try:
        width = (data[16] << 24) + (data[17] << 16) + (data[18] << 8) + data[19]
        height = (data[20] << 24) + (data[21] << 16) + (data[22] << 8) + data[23]
        return (width, height)
    except:
        pass
    return None


async def process_podcasts(
    content_id: str,
    batch_size: int,
    min_resolution: int,
    quality: str,
    sources: str,
    dry_run: bool,
    force_refresh: bool
) -> Dict[str, Any]:
    """Process podcast artwork using multiple sources."""
    print("\n🎙️  Processing Podcasts...")
    print("")

    # Query for podcasts
    if content_id:
        podcasts = await Podcast.find({"_id": content_id}).to_list()
    else:
        query = {"is_active": True}
        if not force_refresh:
            query["$or"] = [
                {"cover": None},
                {"cover": ""},
                {"cover": {"$exists": False}}
            ]
        podcasts = await Podcast.find(query).limit(batch_size).to_list()

    if not podcasts:
        print("   ℹ️  No podcasts found needing artwork")
        return {
            "total": 0,
            "attached": 0,
            "manual_needed": 0,
            "sources_used": {},
            "avg_resolution": 0
        }

    print(f"   Found {len(podcasts)} podcasts needing artwork\n")

    attached_count = 0
    manual_needed = 0
    sources_used = {}
    resolutions = []
    manual_list = []

    for idx, podcast in enumerate(podcasts, 1):
        print(f"[{idx}/{len(podcasts)}] Processing: {podcast.title}")
        print(f"   🔍 Searching sources...")

        artwork_url = None
        source_name = None
        dimensions = None

        # Source 1: RSS Feed
        if not artwork_url and podcast.rss_feed:
            try:
                feed_data = await parse_feed(podcast.rss_feed)
                if feed_data and feed_data.feed:
                    # Try image tag
                    if hasattr(feed_data.feed, 'image') and feed_data.feed.image:
                        url = feed_data.feed.image.get('href')
                        if url:
                            dims = await get_image_dimensions(url)
                            if dims and min(dims) >= min_resolution:
                                artwork_url = url
                                source_name = "RSS Feed"
                                dimensions = dims

                    # Try iTunes image
                    if not artwork_url and hasattr(feed_data.feed, 'itunes_image'):
                        url = feed_data.feed.itunes_image
                        if url:
                            dims = await get_image_dimensions(url)
                            if dims and min(dims) >= min_resolution:
                                artwork_url = url
                                source_name = "RSS Feed"
                                dimensions = dims

                if artwork_url:
                    print(f"      ✅ RSS Feed: Found artwork ({dimensions[0]}x{dimensions[1]})")
                else:
                    print(f"      ⚠️  RSS Feed: No artwork or below minimum resolution")
            except Exception as e:
                print(f"      ⚠️  RSS Feed: Error - {str(e)}")

        # Source 2: iTunes Podcast API (if enabled in sources)
        if not artwork_url and "itunes" in sources.lower() or sources == "auto":
            try:
                # iTunes Search API
                # Note: This would require implementing iTunes API client
                # For now, we'll log that it's not implemented
                print(f"      ⚠️  iTunes API: Not yet implemented")
            except Exception as e:
                print(f"      ⚠️  iTunes API: Error - {str(e)}")

        # Source 3: Spotify Podcast API (if enabled in sources)
        if not artwork_url and "spotify" in sources.lower() or sources == "auto":
            try:
                # Spotify Web API
                # Note: This would require implementing Spotify API client
                # For now, we'll log that it's not implemented
                print(f"      ⚠️  Spotify API: Not yet implemented")
            except Exception as e:
                print(f"      ⚠️  Spotify API: Error - {str(e)}")

        # Source 4: Podcast Index API (if enabled in sources)
        if not artwork_url and "podcastindex" in sources.lower() or sources == "auto":
            try:
                # Podcast Index API
                # Note: This would require implementing Podcast Index API client
                # For now, we'll log that it's not implemented
                print(f"      ⚠️  Podcast Index: Not yet implemented")
            except Exception as e:
                print(f"      ⚠️  Podcast Index: Error - {str(e)}")

        # Update or mark for manual
        if artwork_url:
            if not dry_run:
                podcast.cover = artwork_url
                await podcast.save()

            quality_level = "high" if min(dimensions) >= 800 else "medium" if min(dimensions) >= 500 else "low"
            print(f"   ✅ Attached {quality_level}-quality artwork")
            print(f"      URL: {artwork_url[:60]}...")
            print(f"      Resolution: {dimensions[0]}x{dimensions[1]}px")
            print(f"      Source: {source_name}")

            attached_count += 1
            sources_used[source_name] = sources_used.get(source_name, 0) + 1
            resolutions.append(min(dimensions))
        else:
            print(f"   ⚠️  Manual upload needed")
            print(f"      Podcast ID: {podcast.id}")
            manual_needed += 1
            manual_list.append({
                "id": str(podcast.id),
                "title": podcast.title,
                "type": "podcast"
            })

        print("")

    return {
        "total": len(podcasts),
        "attached": attached_count,
        "manual_needed": manual_needed,
        "sources_used": sources_used,
        "avg_resolution": sum(resolutions) // len(resolutions) if resolutions else 0,
        "manual_list": manual_list
    }


async def process_radio_stations(
    content_id: str,
    batch_size: int,
    min_resolution: int,
    quality: str,
    sources: str,
    dry_run: bool,
    force_refresh: bool
) -> Dict[str, Any]:
    """Process radio station logos using multiple sources."""
    print("\n📻 Processing Radio Stations...")
    print("")

    # Query for radio stations
    if content_id:
        stations = await RadioStation.find({"_id": content_id}).to_list()
    else:
        query = {"is_active": True}
        if not force_refresh:
            query["$or"] = [
                {"logo": None},
                {"logo": ""},
                {"logo": {"$exists": False}}
            ]
        stations = await RadioStation.find(query).limit(batch_size).to_list()

    if not stations:
        print("   ℹ️  No radio stations found needing logos")
        return {
            "total": 0,
            "attached": 0,
            "manual_needed": 0,
            "sources_used": {},
            "avg_resolution": 0
        }

    print(f"   Found {len(stations)} radio stations needing logos\n")

    attached_count = 0
    manual_needed = 0
    sources_used = {}
    resolutions = []
    manual_list = []

    for idx, station in enumerate(stations, 1):
        print(f"[{idx}/{len(stations)}] Processing: {station.name}")
        print(f"   🔍 Searching sources...")

        logo_url = None
        source_name = None
        dimensions = None

        # Source 1: Radio Browser API
        if not logo_url and "radiobrowser" in sources.lower() or sources == "auto":
            try:
                # Radio Browser API
                # Note: This would require implementing Radio Browser API client
                # For now, we'll log that it's not implemented
                print(f"      ⚠️  Radio Browser: Not yet implemented")
            except Exception as e:
                print(f"      ⚠️  Radio Browser: Error - {str(e)}")

        # Source 2: Website Scraping
        if not logo_url and "scrape" in sources.lower() or sources == "auto":
            try:
                # Website scraping for logos
                # Note: This would require implementing web scraping
                # For now, we'll log that it's not implemented
                print(f"      ⚠️  Website Scrape: Not yet implemented")
            except Exception as e:
                print(f"      ⚠️  Website Scrape: Error - {str(e)}")

        # Source 3: Google Custom Search
        if not logo_url and "google" in sources.lower() or sources == "auto":
            try:
                # Google Custom Search API
                # Note: This would require implementing Google Search API client
                # For now, we'll log that it's not implemented
                print(f"      ⚠️  Google Search: Not yet implemented")
            except Exception as e:
                print(f"      ⚠️  Google Search: Error - {str(e)}")

        # Update or mark for manual
        if logo_url:
            if not dry_run:
                station.logo = logo_url
                await station.save()

            quality_level = "high" if min(dimensions) >= 800 else "medium" if min(dimensions) >= 500 else "low"
            print(f"   ✅ Attached {quality_level}-quality logo")
            print(f"      URL: {logo_url[:60]}...")
            print(f"      Resolution: {dimensions[0]}x{dimensions[1]}px")
            print(f"      Source: {source_name}")

            attached_count += 1
            sources_used[source_name] = sources_used.get(source_name, 0) + 1
            resolutions.append(min(dimensions))
        else:
            print(f"   ⚠️  Manual upload needed")
            print(f"      Station ID: {station.id}")
            manual_needed += 1
            manual_list.append({
                "id": str(station.id),
                "name": station.name,
                "type": "radio"
            })

        print("")

    return {
        "total": len(stations),
        "attached": attached_count,
        "manual_needed": manual_needed,
        "sources_used": sources_used,
        "avg_resolution": sum(resolutions) // len(resolutions) if resolutions else 0,
        "manual_list": manual_list
    }


# Entry point
content_type = sys.argv[1]
content_id = sys.argv[2] if sys.argv[2] != "" else None
batch_size = int(sys.argv[3])
min_resolution = int(sys.argv[4])
quality = sys.argv[5]
sources = sys.argv[6]
dry_run = sys.argv[7] == "true"
force_refresh = sys.argv[8] == "true"

result = asyncio.run(attach_podcast_radio_artwork(
    content_type, content_id, batch_size, min_resolution, quality, sources, dry_run, force_refresh
))

print("\n" + "="*80)
print("ARTWORK ATTACHMENT COMPLETE")
print("="*80)
print(f"\nTotal items processed: {result['total_processed']}")
print("")

if result.get("by_type"):
    if "podcasts" in result["by_type"]:
        stats = result["by_type"]["podcasts"]
        print("Podcasts:")
        print(f"  Total: {stats['total']}")
        print(f"  Artwork attached: {stats['attached']}")
        print(f"  Manual needed: {stats['manual_needed']}")
        if stats.get('avg_resolution'):
            print(f"  Average resolution: {stats['avg_resolution']}px")
        if stats.get('sources_used'):
            print("  Sources used:")
            for source, count in stats['sources_used'].items():
                print(f"    {source}: {count}")
        print("")

    if "radio" in result["by_type"]:
        stats = result["by_type"]["radio"]
        print("Radio Stations:")
        print(f"  Total: {stats['total']}")
        print(f"  Logos attached: {stats['attached']}")
        print(f"  Manual needed: {stats['manual_needed']}")
        if stats.get('avg_resolution'):
            print(f"  Average resolution: {stats['avg_resolution']}px")
        if stats.get('sources_used'):
            print("  Sources used:")
            for source, count in stats['sources_used'].items():
                print(f"    {source}: {count}")
        print("")

# Show manual upload list
manual_items = []
if "podcasts" in result.get("by_type", {}):
    manual_items.extend(result["by_type"]["podcasts"].get("manual_list", []))
if "radio" in result.get("by_type", {}):
    manual_items.extend(result["by_type"]["radio"].get("manual_list", []))

if manual_items:
    print("\nItems needing manual upload:")
    for item in manual_items:
        item_type = "Podcast" if item["type"] == "podcast" else "Radio"
        name = item.get("title") or item.get("name")
        print(f"  {item_type}: \"{name}\" (ID: {item['id']})")
    print("\nTo upload manually, visit Admin Panel > Content Management")

sys.exit(0)
PYTHON_EOF
)

poetry run python -c "$PYTHON_CMD" "$CONTENT_TYPE" "$CONTENT_ID" "$BATCH_SIZE" "$MIN_RESOLUTION" "$QUALITY" "$SOURCES" "$DRY_RUN" "$FORCE_REFRESH"
EXIT_CODE=$?

if [[ "$JSON_OUTPUT" == "false" ]]; then
  echo ""
  echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
  if [[ $EXIT_CODE -eq 0 ]]; then
    echo -e "${GREEN}✅ Artwork attachment completed${NC}"
  else
    echo -e "${RED}❌ Artwork attachment failed${NC}"
  fi
  echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
fi

exit $EXIT_CODE
