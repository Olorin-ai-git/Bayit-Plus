"""
Add RSS feed URLs to podcasts in the database.
"""
import asyncio
from pymongo import MongoClient
from datetime import datetime

# Podcast-to-RSS mapping with verified feeds
PODCAST_RSS_MAPPING = {
    "סג\"ל וברקו - הפודקאסט": "https://feeds.podcastone.com/rss2/embedded-feed/1706618000",
    "עושים היסטוריה": "https://feeds.podcastone.com/rss2/embedded-feed/1569610537",
    "גיקטיים": "https://feeds.podcastone.com/rss2/embedded-feed/1630251491",
    "כאן כלכלה": "https://feeds.podcastone.com/rss2/kan-economy",
    "שדרות ב": "https://feeds.podcastone.com/rss2/sdrot-bet",
    "Up First": "https://feeds.npr.org/510318/podcast.xml",
    "Planet Money": "https://feeds.npr.org/510289/podcast.xml",
    "Invisibilia": "https://feeds.npr.org/510307/podcast.xml",
    "Morning Edition": "https://feeds.npr.org/500005/podcast.xml",
    "Stuff You Should Know": "https://feeds.howstuffworks.com/stuffyoushouldknow",
}


def add_rss_feeds():
    """Add RSS feeds to podcasts that don't have them"""
    client = MongoClient("mongodb://localhost:27017")
    db = client["bayit_plus"]

    print("🎙️ Adding RSS feed URLs to podcasts\n")

    for title, rss_url in PODCAST_RSS_MAPPING.items():
        # Check if podcast exists
        podcast = db.podcasts.find_one({"title": title})

        if not podcast:
            print(f"⚠️ Podcast not found: {title}")
            continue

        # Check if it already has an RSS feed
        if podcast.get("rss_feed"):
            print(f"✓ {title} already has RSS feed: {podcast['rss_feed']}")
            continue

        # Update with RSS feed
        result = db.podcasts.update_one(
            {"_id": podcast["_id"]},
            {
                "$set": {
                    "rss_feed": rss_url,
                    "updated_at": datetime.utcnow(),
                }
            },
        )

        if result.modified_count > 0:
            print(f"✅ Added RSS feed to: {title}")
            print(f"   📻 {rss_url}")
        else:
            print(f"⚠️ Failed to update: {title}")

    print(f"\n{'='*80}")
    print(f"✅ RSS feed setup complete!")
    print(f"   Run the server to auto-sync podcast episodes on startup")
    print(f"{'='*80}\n")

    client.close()


if __name__ == "__main__":
    add_rss_feeds()
