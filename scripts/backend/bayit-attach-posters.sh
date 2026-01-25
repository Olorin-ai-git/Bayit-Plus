#!/usr/bin/env bash
###############################################################################
# Bayit+ Poster Attachment & Metadata Enrichment Script
#
# Finds and attaches missing posters/artwork and enriches metadata:
# 1. VOD Content - Fetch posters + full metadata from TMDB (title/year search)
#    - Posters, backdrops, descriptions, ratings, cast, genres, trailers, etc.
# 2. Podcasts - Extract cover art from RSS feed artwork
# 3. Radio Stations - Manual assignment or default logos
# 4. Live Channels - Manual assignment or default logos
#
# Usage:
#   ./scripts/backend/attach-posters.sh [options]
#
# Options:
#   --content-type TYPE   Content type: vod, podcast, radio, live, all (default: all)
#   --content-id ID       Process specific content item by ID
#   --batch-size N        Process N items at a time (default: 20)
#   --source SOURCE       Poster source: tmdb, rss, manual, auto (default: auto)
#   --dry-run             Preview without making changes
#   --api-url URL         Backend API URL (default: http://localhost:8000)
#   --json                Output results in JSON format
#   --help                Show this help message
#
# Examples:
#   # Find and attach posters for all content types
#   ./scripts/backend/attach-posters.sh
#
#   # Attach TMDB posters to VOD content only
#   ./scripts/backend/attach-posters.sh --content-type vod --source tmdb
#
#   # Extract RSS artwork for podcasts
#   ./scripts/backend/attach-posters.sh --content-type podcast --source rss
#
#   # Dry run to preview changes
#   ./scripts/backend/attach-posters.sh --dry-run
#
#   # Process specific content item
#   ./scripts/backend/attach-posters.sh --content-id 507f1f77bcf86cd799439011
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
BATCH_SIZE=20
SOURCE="auto"
DRY_RUN=false
API_URL="${API_URL:-http://localhost:8000}"
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
    --source)
      SOURCE="$2"
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

# Validate content type
if [[ ! "$CONTENT_TYPE" =~ ^(vod|podcast|radio|live|all)$ ]]; then
  echo -e "${RED}❌ Invalid content type: $CONTENT_TYPE${NC}"
  echo "Valid types: vod, podcast, radio, live, all"
  exit 1
fi

# Validate source
if [[ ! "$SOURCE" =~ ^(tmdb|rss|manual|auto)$ ]]; then
  echo -e "${RED}❌ Invalid source: $SOURCE${NC}"
  echo "Valid sources: tmdb, rss, manual, auto"
  exit 1
fi

# Print header (unless JSON mode)
if [[ "$JSON_OUTPUT" == "false" ]]; then
  echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║  Bayit+ Poster Attachment                                    ║${NC}"
  echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "${BLUE}Configuration:${NC}"
  echo "  Content Type: $CONTENT_TYPE"
  [[ -n "$CONTENT_ID" ]] && echo "  Content ID: $CONTENT_ID"
  echo "  Source: $SOURCE"
  echo "  Batch Size: $BATCH_SIZE"
  echo "  Dry Run: $DRY_RUN"
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

# Main poster attachment logic
cd "$BACKEND_DIR"

if [[ "$JSON_OUTPUT" == "false" ]]; then
  echo -e "${MAGENTA}🖼️  Finding and attaching posters + enriching metadata...${NC}"
  echo "   Content Type: $CONTENT_TYPE"
  echo "   Source: $SOURCE"
  echo "   Enrichment: Full TMDB metadata for VOD content"
  echo ""
fi

# Use Python to find and attach posters
PYTHON_CMD=$(cat <<'PYTHON_EOF'
import asyncio
import sys
from typing import List, Dict, Any
from app.core.database import connect_to_mongo
from app.models.content import Content, Podcast, PodcastEpisode, RadioStation, LiveChannel
from app.services.tmdb_service import TMDBService
from app.services.podcast_sync import parse_feed
from app.services.content_cleanup_service import ContentCleanupService
from app.core.config import settings

async def find_and_attach_posters(
    content_type: str,
    content_id: str,
    batch_size: int,
    source: str,
    dry_run: bool
) -> Dict[str, Any]:
    """Find and attach posters to content."""
    await connect_to_mongo()

    results = {
        "total_found": 0,
        "total_updated": 0,
        "by_type": {},
        "errors": []
    }

    # Process VOD content
    if content_type in ("vod", "all"):
        vod_results = await process_vod_content(content_id, batch_size, source, dry_run)
        results["by_type"]["vod"] = vod_results
        results["total_found"] += vod_results["found"]
        results["total_updated"] += vod_results["updated"]

    # Process podcasts
    if content_type in ("podcast", "all"):
        podcast_results = await process_podcasts(content_id, batch_size, source, dry_run)
        results["by_type"]["podcast"] = podcast_results
        results["total_found"] += podcast_results["found"]
        results["total_updated"] += podcast_results["updated"]

    # Process radio stations
    if content_type in ("radio", "all"):
        radio_results = await process_radio_stations(content_id, batch_size, source, dry_run)
        results["by_type"]["radio"] = radio_results
        results["total_found"] += radio_results["found"]
        results["total_updated"] += radio_results["updated"]

    # Process live channels
    if content_type in ("live", "all"):
        live_results = await process_live_channels(content_id, batch_size, source, dry_run)
        results["by_type"]["live"] = live_results
        results["total_found"] += live_results["found"]
        results["total_updated"] += live_results["updated"]

    return results


async def process_vod_content(
    content_id: str,
    batch_size: int,
    source: str,
    dry_run: bool
) -> Dict[str, Any]:
    """Process VOD content posters using TMDB."""
    print("\n📹 Processing VOD Content...")
    print("   Source: TMDB (The Movie Database)")
    print("")

    # Query for VOD content missing posters
    if content_id:
        items = await Content.find({"_id": content_id}).to_list()
    else:
        query = {
            "is_published": True,
            "$or": [
                {"poster_url": None},
                {"poster_url": ""},
                {"poster_url": {"$exists": False}},
                {"thumbnail": None},
                {"thumbnail": ""},
                {"thumbnail": {"$exists": False}}
            ]
        }
        items = await Content.find(query).limit(batch_size).to_list()

    if not items:
        print("   ℹ️  No VOD content items found needing posters")
        return {"found": 0, "updated": 0, "skipped": 0, "errors": 0}

    print(f"   Found {len(items)} VOD items needing posters\n")

    tmdb = TMDBService()
    updated_count = 0
    error_count = 0

    cleanup_service = ContentCleanupService()

    for idx, item in enumerate(items, 1):
        print(f"[{idx}/{len(items)}] Processing: {item.title}")

        try:
            # Use TMDB to fetch metadata
            is_series = item.is_series or item.content_type == "series"

            # For series episodes, extract series name
            search_title = item.title
            if is_series:
                # Extract series name from episode title
                cleaned = cleanup_service.clean_title(item.title)
                if cleaned.get("series_name"):
                    search_title = cleaned["series_name"]
                    print(f"   🔍 Searching TMDB for series: {search_title}")

            if is_series:
                metadata = await tmdb.enrich_series_content(search_title, item.year)
            else:
                metadata = await tmdb.enrich_movie_content(search_title, item.year)

            if metadata.get("poster"):
                fields_updated = []

                if not dry_run:
                    # Update poster and backdrop
                    item.poster_url = metadata["poster"]
                    item.thumbnail = metadata["poster"]
                    fields_updated.append("poster")

                    if metadata.get("backdrop"):
                        item.backdrop = metadata["backdrop"]
                        fields_updated.append("backdrop")

                    # Update TMDB ID
                    if metadata.get("tmdb_id") and not item.tmdb_id:
                        item.tmdb_id = str(metadata["tmdb_id"])
                        fields_updated.append("tmdb_id")

                    # Update IMDB ID
                    if metadata.get("imdb_id") and not item.imdb_id:
                        item.imdb_id = metadata["imdb_id"]
                        fields_updated.append("imdb_id")

                    # Update description if missing
                    if metadata.get("overview") and not item.description:
                        item.description = metadata["overview"]
                        item.description_en = metadata["overview"]
                        fields_updated.append("description")

                    # Update rating
                    if metadata.get("imdb_rating") and not item.imdb_rating:
                        item.imdb_rating = metadata["imdb_rating"]
                        fields_updated.append("rating")

                    if metadata.get("imdb_votes") and not item.imdb_votes:
                        item.imdb_votes = metadata["imdb_votes"]

                    # Update genres
                    if metadata.get("genres") and not item.genres:
                        item.genres = metadata["genres"]
                        if metadata["genres"]:
                            item.genre = metadata["genres"][0]
                        fields_updated.append("genres")

                    # Update cast and director
                    if metadata.get("cast") and not item.cast:
                        item.cast = metadata["cast"]
                        fields_updated.append("cast")

                    if metadata.get("director") and not item.director:
                        item.director = metadata["director"]
                        fields_updated.append("director")

                    # Update year if missing
                    if metadata.get("release_year") and not item.year:
                        item.year = metadata["release_year"]
                        fields_updated.append("year")

                    # Update runtime for movies
                    if metadata.get("runtime") and not item.duration:
                        # Convert minutes to HH:MM:SS format
                        runtime_min = metadata["runtime"]
                        hours = runtime_min // 60
                        minutes = runtime_min % 60
                        item.duration = f"{hours}:{minutes:02d}:00"
                        fields_updated.append("duration")

                    # Update series-specific fields
                    if is_series:
                        if metadata.get("total_seasons") and not item.total_seasons:
                            item.total_seasons = metadata["total_seasons"]
                            fields_updated.append("seasons")

                        if metadata.get("total_episodes") and not item.total_episodes:
                            item.total_episodes = metadata["total_episodes"]
                            fields_updated.append("episodes")

                    # Update trailer URL
                    if metadata.get("trailer_url") and not item.trailer_url:
                        item.trailer_url = metadata["trailer_url"]
                        fields_updated.append("trailer")

                    await item.save()

                print(f"   ✅ Enriched from TMDB")
                print(f"      Poster: {metadata['poster'][:60]}...")
                print(f"      Updated fields: {', '.join(fields_updated)}")
                updated_count += 1
            else:
                print(f"   ⚠️  No metadata found on TMDB")

        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
            error_count += 1

        print("")

    return {
        "found": len(items),
        "updated": updated_count,
        "skipped": len(items) - updated_count - error_count,
        "errors": error_count
    }


async def process_podcasts(
    content_id: str,
    batch_size: int,
    source: str,
    dry_run: bool
) -> Dict[str, Any]:
    """Process podcast artwork from RSS feeds."""
    print("\n🎙️  Processing Podcasts...")
    print("   Source: RSS Feed Artwork")
    print("")

    # Query for podcasts missing cover
    if content_id:
        podcasts = await Podcast.find({"_id": content_id}).to_list()
    else:
        query = {
            "is_active": True,
            "rss_feed": {"$exists": True, "$ne": None},
            "$or": [
                {"cover": None},
                {"cover": ""},
                {"cover": {"$exists": False}}
            ]
        }
        podcasts = await Podcast.find(query).limit(batch_size).to_list()

    if not podcasts:
        print("   ℹ️  No podcasts found needing artwork")
        return {"found": 0, "updated": 0, "skipped": 0, "errors": 0}

    print(f"   Found {len(podcasts)} podcasts needing artwork\n")

    updated_count = 0
    error_count = 0

    for idx, podcast in enumerate(podcasts, 1):
        print(f"[{idx}/{len(podcasts)}] Processing: {podcast.title}")

        try:
            if not podcast.rss_feed:
                print(f"   ⚠️  No RSS feed configured")
                continue

            # Parse RSS feed to extract artwork
            feed_data = await parse_feed(podcast.rss_feed)

            artwork_url = None
            if feed_data and feed_data.feed:
                # Try image tag first
                if hasattr(feed_data.feed, 'image') and feed_data.feed.image:
                    artwork_url = feed_data.feed.image.get('href')

                # Try iTunes image
                if not artwork_url and hasattr(feed_data.feed, 'itunes_image'):
                    artwork_url = feed_data.feed.itunes_image

            if artwork_url:
                if not dry_run:
                    podcast.cover = artwork_url
                    await podcast.save()

                print(f"   ✅ Attached artwork from RSS feed")
                print(f"      Artwork: {artwork_url[:60]}...")
                updated_count += 1
            else:
                print(f"   ⚠️  No artwork found in RSS feed")

        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
            error_count += 1

        print("")

    return {
        "found": len(podcasts),
        "updated": updated_count,
        "skipped": len(podcasts) - updated_count - error_count,
        "errors": error_count
    }


async def process_radio_stations(
    content_id: str,
    batch_size: int,
    source: str,
    dry_run: bool
) -> Dict[str, Any]:
    """Process radio station logos."""
    print("\n📻 Processing Radio Stations...")
    print("   Note: Radio logos require manual assignment")
    print("")

    # Query for radio stations missing logos
    if content_id:
        stations = await RadioStation.find({"_id": content_id}).to_list()
    else:
        query = {
            "is_active": True,
            "$or": [
                {"logo": None},
                {"logo": ""},
                {"logo": {"$exists": False}}
            ]
        }
        stations = await RadioStation.find(query).limit(batch_size).to_list()

    if not stations:
        print("   ℹ️  No radio stations found needing logos")
        return {"found": 0, "updated": 0, "skipped": 0, "errors": 0}

    print(f"   Found {len(stations)} radio stations needing logos")
    print("   Use admin panel to upload logos manually\n")

    for idx, station in enumerate(stations, 1):
        print(f"[{idx}/{len(stations)}] {station.name}")
        print(f"   ID: {station.id}")
        print(f"   Genre: {station.genre or 'N/A'}")
        print("")

    return {
        "found": len(stations),
        "updated": 0,
        "skipped": len(stations),
        "errors": 0
    }


async def process_live_channels(
    content_id: str,
    batch_size: int,
    source: str,
    dry_run: bool
) -> Dict[str, Any]:
    """Process live channel logos/thumbnails."""
    print("\n📺 Processing Live Channels...")
    print("   Note: Channel logos require manual assignment")
    print("")

    # Query for live channels missing logos/thumbnails
    if content_id:
        channels = await LiveChannel.find({"_id": content_id}).to_list()
    else:
        query = {
            "is_active": True,
            "$or": [
                {"logo": None},
                {"logo": ""},
                {"logo": {"$exists": False}},
                {"thumbnail": None},
                {"thumbnail": ""},
                {"thumbnail": {"$exists": False}}
            ]
        }
        channels = await LiveChannel.find(query).limit(batch_size).to_list()

    if not channels:
        print("   ℹ️  No live channels found needing logos")
        return {"found": 0, "updated": 0, "skipped": 0, "errors": 0}

    print(f"   Found {len(channels)} live channels needing logos")
    print("   Use admin panel to upload logos manually\n")

    for idx, channel in enumerate(channels, 1):
        print(f"[{idx}/{len(channels)}] {channel.name}")
        print(f"   ID: {channel.id}")
        print(f"   Category: {channel.category or 'N/A'}")
        print("")

    return {
        "found": len(channels),
        "updated": 0,
        "skipped": len(channels),
        "errors": 0
    }


# Entry point
content_type = sys.argv[1]
content_id = sys.argv[2] if sys.argv[2] != "" else None
batch_size = int(sys.argv[3])
source = sys.argv[4]
dry_run = sys.argv[5] == "true"

result = asyncio.run(find_and_attach_posters(
    content_type, content_id, batch_size, source, dry_run
))

print("\n" + "="*80)
print("POSTER ATTACHMENT COMPLETE")
print("="*80)
print(f"Total items found: {result['total_found']}")
print(f"Total updated: {result['total_updated']}")
print("")

if result.get("by_type"):
    for ctype, stats in result["by_type"].items():
        print(f"{ctype.upper()}: found={stats['found']}, updated={stats['updated']}, errors={stats.get('errors', 0)}")

sys.exit(0)
PYTHON_EOF
)

poetry run python -c "$PYTHON_CMD" "$CONTENT_TYPE" "$CONTENT_ID" "$BATCH_SIZE" "$SOURCE" "$DRY_RUN"
EXIT_CODE=$?

if [[ "$JSON_OUTPUT" == "false" ]]; then
  echo ""
  echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
  if [[ $EXIT_CODE -eq 0 ]]; then
    echo -e "${GREEN}✅ Poster attachment completed${NC}"
  else
    echo -e "${RED}❌ Poster attachment failed${NC}"
  fi
  echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
fi

exit $EXIT_CODE
