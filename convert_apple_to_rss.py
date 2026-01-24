#!/usr/bin/env python3
"""
Quick Apple Podcasts to RSS converter without database dependencies.
"""
import asyncio
import sys
import httpx
import re

async def convert_apple_to_rss(apple_url: str):
    """Convert Apple Podcasts URL to RSS feed URL."""

    # Extract podcast ID
    match = re.search(r"/id(\d+)", apple_url)
    if not match:
        print(f"❌ Could not extract podcast ID from URL: {apple_url}")
        return None

    podcast_id = match.group(1)

    print(f"\n{'='*80}")
    print(f"🍎 Apple Podcasts to RSS Converter")
    print(f"{'='*80}\n")
    print(f"📱 Apple Podcasts URL: {apple_url}")
    print(f"🆔 Podcast ID: {podcast_id}")

    # Use iTunes API to get RSS feed
    itunes_url = f"https://itunes.apple.com/lookup?id={podcast_id}&entity=podcast"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            print(f"\n🔍 Fetching from iTunes API...")
            response = await client.get(itunes_url, headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            })
            response.raise_for_status()

            data = response.json()

            if data.get("resultCount", 0) == 0:
                print(f"❌ Podcast not found in iTunes API")
                return None

            podcast = data["results"][0]
            rss_url = podcast.get("feedUrl")

            if rss_url:
                print(f"\n✅ Successfully converted to RSS!")
                print(f"\n📊 Podcast Details:")
                print(f"   Title: {podcast.get('trackName', 'Unknown')}")
                print(f"   Artist: {podcast.get('artistName', 'Unknown')}")
                print(f"   Genre: {podcast.get('primaryGenreName', 'Unknown')}")
                print(f"\n📡 RSS Feed URL:")
                print(f"   {rss_url}")
                print(f"\n{'='*80}\n")
                return rss_url
            else:
                print(f"❌ No RSS feed found in iTunes response")
                return None

    except Exception as e:
        print(f"❌ Error: {e}")
        return None

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python convert_apple_to_rss.py <apple_podcasts_url>")
        print("\nExample:")
        print('  python convert_apple_to_rss.py "https://podcasts.apple.com/us/podcast/name/id1234567890"')
        sys.exit(1)

    apple_url = sys.argv[1]
    asyncio.run(convert_apple_to_rss(apple_url))
