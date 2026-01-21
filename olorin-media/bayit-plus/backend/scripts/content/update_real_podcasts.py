"""
Update podcasts with real episode data from RSS feeds.
"""
import asyncio
from pymongo import MongoClient
from datetime import datetime
from app.services.podcast_scraper import scrape_all_podcasts


async def main():
    client = MongoClient("mongodb://localhost:27017")
    db = client["bayit_plus"]

    print("🎙️ Updating podcasts with REAL RSS feed episodes\n")

    podcasts = await scrape_all_podcasts()
    print(f"✅ Fetched {len(podcasts)} podcasts from RSS feeds\n")

    for name, podcast_data in podcasts.items():
        print(f"📻 {name}")
        print(f"   Episodes: {len(podcast_data.episodes)}")

        # Prepare episodes for database
        episodes = []
        for i, ep in enumerate(podcast_data.episodes, 1):
            episodes.append(
                {
                    "title": ep.title,
                    "description": ep.description,
                    "episode_number": ep.episode_number or i,
                    "season": ep.season,
                    "audio_url": ep.audio_url,
                    "duration": ep.duration,
                    "published_date": ep.published_date or datetime.utcnow(),
                    "guid": ep.guid,
                }
            )

        # Get latest episode date
        latest_date = None
        if episodes:
            latest_date = max(
                (
                    ep.get("published_date")
                    for ep in episodes
                    if ep.get("published_date")
                ),
                default=None,
            )

        # Update or create podcast
        result = db.podcasts.update_one(
            {"title": name},
            {
                "$set": {
                    "author": podcast_data.author or name,
                    "description": podcast_data.description,
                    "cover": podcast_data.cover,
                    "category": podcast_data.category,
                    "is_active": True,
                    "episode_count": len(episodes),
                    "latest_episode_date": latest_date or datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                },
                "$push": {"episodes": {"$each": episodes}},
            },
            upsert=True,
        )

        status = "created" if result.upserted_id else "updated"
        print(f"   ✓ {status}\n")

    print("=" * 80)
    print(f"\n✅ Podcasts updated with real episode data!")

    client.close()


if __name__ == "__main__":
    asyncio.run(main())
