"""
Find Apple Podcasts URLs by searching for podcast names.

This script helps find Apple Podcasts links for your podcasts in the database.

Usage:
    poetry run python find_apple_podcasts.py

    Or search for specific podcast:
    poetry run python find_apple_podcasts.py "Podcast Name"
"""
import asyncio
import sys
import httpx
from pymongo import MongoClient

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
}


async def search_apple_podcasts(query: str, limit: int = 5) -> list:
    """
    Search for podcasts on Apple Podcasts using iTunes API.

    Args:
        query: Podcast name to search for
        limit: Maximum results to return

    Returns:
        List of podcast results
    """
    try:
        # Use iTunes Search API
        url = f"https://itunes.apple.com/search?term={query}&entity=podcast&limit={limit}"

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, headers=HEADERS)
            response.raise_for_status()

            data = response.json()
            results = []

            for result in data.get("results", []):
                results.append({
                    "id": result.get("trackId"),
                    "name": result.get("trackName"),
                    "artist": result.get("artistName"),
                    "country": result.get("trackId"),  # For building URL
                    "url": f"https://podcasts.apple.com/podcast/{result.get('trackName').replace(' ', '-')}/id{result.get('trackId')}",
                })

            return results

    except Exception as e:
        print(f"Error searching Apple Podcasts: {str(e)}")
        return []


async def search_and_display():
    """Search for all podcasts in database and display Apple URLs."""
    client = MongoClient("mongodb://localhost:27017")
    db = client["bayit_plus"]

    # Get podcasts without RSS
    podcasts = list(db.podcasts.find({"rss_feed": None}).sort([("title", 1)]))

    if not podcasts:
        print("✅ All podcasts have RSS feeds!")
        client.close()
        return

    print("\n" + "="*100)
    print(f"🔍 Searching for Apple Podcasts URLs ({len(podcasts)} podcasts)")
    print("="*100 + "\n")

    mapping = {}
    found_count = 0
    not_found = []

    for i, podcast in enumerate(podcasts, 1):
        title = podcast["title"]
        print(f"[{i:2d}/{len(podcasts)}] Searching: {title}...", end=" ", flush=True)

        # Search Apple Podcasts
        results = await search_apple_podcasts(title, limit=3)

        if results:
            # Take first result (most likely match)
            best_match = results[0]
            apple_url = best_match["url"]
            mapping[title] = apple_url
            print(f"✅ Found")
            print(f"       Artist: {best_match['artist']}")
            print(f"       URL: {apple_url}\n")
            found_count += 1
        else:
            print(f"❌ Not found")
            not_found.append(title)

        # Rate limit: be nice to Apple's servers
        await asyncio.sleep(0.5)

    # Print Python dict format for copy-paste
    print("\n" + "="*100)
    print("📝 Found Podcasts - Copy this to bulk_update_podcasts.py:")
    print("="*100 + "\n")
    print("PODCASTS_MAPPING = {")
    for title, url in mapping.items():
        print(f'    "{title}": "{url}",')
    print("}")

    print(f"\n📊 Summary:")
    print(f"   ✅ Found: {found_count}")
    print(f"   ❌ Not found: {len(not_found)}")

    if not_found:
        print(f"\n❌ Not found on Apple Podcasts:")
        for title in not_found[:10]:
            print(f"   - {title}")
        if len(not_found) > 10:
            print(f"   ... and {len(not_found) - 10} more")

    client.close()


if __name__ == "__main__":
    asyncio.run(search_and_display())
