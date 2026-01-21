"""
Migrate nested episode arrays to separate PodcastEpisode documents.
"""
import asyncio
from datetime import datetime

from pymongo import MongoClient


async def migrate_episodes():
    client = MongoClient("mongodb://localhost:27017")
    db = client["bayit_plus"]

    podcasts = db.podcasts.find({})
    total_episodes = 0

    for podcast in podcasts:
        podcast_id = str(podcast["_id"])
        episodes = podcast.get("episodes", [])

        if not episodes:
            continue

        print(f"📻 Migrating {len(episodes)} episodes for: {podcast['title']}")

        # Insert each episode as a separate document
        for episode_data in episodes:
            episode_doc = {
                "podcast_id": podcast_id,
                "title": episode_data.get("title"),
                "description": episode_data.get("description"),
                "audio_url": episode_data.get("audio_url"),
                "duration": episode_data.get("duration"),
                "episode_number": episode_data.get("episode_number"),
                "season_number": episode_data.get("season", 1),
                "published_at": episode_data.get("published_date") or datetime.utcnow(),
                "thumbnail": None,
            }

            db.podcast_episodes.insert_one(episode_doc)
            total_episodes += 1

        # Remove the episodes array from the podcast document
        db.podcasts.update_one({"_id": podcast["_id"]}, {"$unset": {"episodes": ""}})

    print(f"\n✅ Successfully migrated {total_episodes} episodes!")
    print(f"   Episodes are now stored in separate podcast_episodes collection")

    client.close()


if __name__ == "__main__":
    asyncio.run(migrate_episodes())
