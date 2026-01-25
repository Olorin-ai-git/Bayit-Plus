#!/usr/bin/env bash
###############################################################################
# Update Podcast Covers from Apple Podcasts
#
# This script searches Apple Podcasts (iTunes API) for official artwork
# and updates podcasts that have generic/placeholder images.
#
# Features:
# - Detects Hebrew podcasts and searches Israeli App Store first
# - Falls back to US App Store for English podcasts
# - Upgrades generic Unsplash images to official artwork
# - Replaces non-Apple sources with high-quality Apple Podcasts art
# - Gets highest resolution available (up to 3000x3000px)
#
# Usage:
#   ./scripts/backend/bayit-update-podcast-covers.sh [options]
#
# Options:
#   --force-all     Update all podcasts, not just those with generic images
#   --dry-run       Preview changes without updating
#   --help          Show this help message
#
###############################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"

FORCE_ALL=false
DRY_RUN=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --force-all)
      FORCE_ALL=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --help)
      sed -n '/^###/,/^###/p' "$0" | sed 's/^# //g' | sed 's/^#//g'
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

cd "$BACKEND_DIR"

# Create Python script
cat > /tmp/update_podcast_covers.py << 'PYTHON_EOF'
import asyncio
import aiohttp
import sys
import json
import re
from app.core.database import connect_to_mongo
from app.models.content import Podcast
from app.core.logging_config import get_logger

logger = get_logger(__name__)

ITUNES_SEARCH_URL = "https://itunes.apple.com/search"


async def search_itunes_podcast(title: str, session: aiohttp.ClientSession) -> dict | None:
    """Search iTunes API for podcast by title."""
    # Detect if title contains Hebrew characters
    has_hebrew = bool(re.search(r'[\u0590-\u05FF]', title))
    countries = ['il', 'us'] if has_hebrew else ['us', 'il']

    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json'
    }

    # Try multiple country stores
    for country in countries:
        try:
            params = {
                'term': title,
                'media': 'podcast',
                'entity': 'podcast',
                'limit': 3,
                'country': country
            }

            async with session.get(ITUNES_SEARCH_URL, params=params, headers=headers, timeout=aiohttp.ClientTimeout(total=10)) as response:
                if response.status == 200:
                    text = await response.text()
                    data = json.loads(text)

                    if data.get('resultCount', 0) > 0:
                        # Try to find best match
                        for result in data['results']:
                            collection_name = result.get('collectionName', '').lower()
                            search_title = title.lower()

                            if search_title in collection_name or collection_name in search_title:
                                return {
                                    'artwork_url': result.get('artworkUrl600', result.get('artworkUrl100')),
                                    'collection_name': result.get('collectionName'),
                                    'artist_name': result.get('artistName'),
                                    'feed_url': result.get('feedUrl'),
                                    'country': country
                                }

                        # Return first result if no exact match
                        result = data['results'][0]
                        return {
                            'artwork_url': result.get('artworkUrl600', result.get('artworkUrl100')),
                            'collection_name': result.get('collectionName'),
                            'artist_name': result.get('artistName'),
                            'feed_url': result.get('feedUrl'),
                            'country': country
                        }
        except Exception:
            continue

    return None


async def main():
    force_all = sys.argv[1] == 'true'
    dry_run = sys.argv[2] == 'true'

    await connect_to_mongo()

    podcasts = await Podcast.find({'is_active': True}).to_list()

    print(f"\n🎙️  Found {len(podcasts)} active podcasts")
    print("="*80)

    needs_update = []
    for p in podcasts:
        if force_all:
            needs_update.append((p, 'force'))
        elif p.cover:
            if 'unsplash.com' in p.cover or 'placeholder' in p.cover.lower():
                needs_update.append((p, 'generic'))
            elif 'mzstatic.com' not in p.cover:
                needs_update.append((p, 'non-apple'))

    print(f"\n📊 Analysis:")
    print(f"   Total podcasts: {len(podcasts)}")
    print(f"   To update: {len(needs_update)}")
    print()

    if not needs_update:
        print("✅ All podcasts already have Apple Podcasts artwork!")
        return

    if dry_run:
        print("🔍 DRY RUN MODE - No changes will be made")
        print()

    updated = 0
    skipped = 0

    async with aiohttp.ClientSession() as session:
        for idx, (podcast, reason) in enumerate(needs_update, 1):
            print(f"[{idx}/{len(needs_update)}] {podcast.title}")

            itunes_data = await search_itunes_podcast(podcast.title, session)

            if itunes_data and itunes_data['artwork_url']:
                artwork_url = itunes_data['artwork_url'].replace('600x600bb', '3000x3000bb')
                print(f"   ✅ Found: {itunes_data['collection_name']}")

                if not dry_run:
                    podcast.cover = artwork_url
                    await podcast.save()
                    updated += 1
                    print(f"   ✅ Updated!")
                else:
                    print(f"   🔍 Would update to: {artwork_url[:60]}...")
            else:
                print(f"   ⚠️  Not found - keeping current")
                skipped += 1

            print()

            # Rate limit
            if idx % 20 == 0 and idx < len(needs_update):
                await asyncio.sleep(3)

    print("="*80)
    print("📊 Summary:")
    if dry_run:
        print(f"   Would update: {updated + skipped}")
    else:
        print(f"   ✅ Updated: {updated}")
        print(f"   ⚠️  Skipped: {skipped}")
    print("="*80)


if __name__ == "__main__":
    asyncio.run(main())
PYTHON_EOF

# Run the script
poetry run python /tmp/update_podcast_covers.py "$FORCE_ALL" "$DRY_RUN"

# Cleanup
rm -f /tmp/update_podcast_covers.py
