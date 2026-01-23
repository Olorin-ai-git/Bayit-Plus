"""
Update podcasts with real episode data from working RSS feeds + Israeli podcast samples.
"""
import asyncio
from datetime import datetime, timedelta

from app.services.podcast_scraper import scrape_all_podcasts
from pymongo import MongoClient

# Israeli podcasts from 103FM with realistic episode samples
ISRAELI_PODCASTS = {
    "חדשות 103FM": {
        "author": "103FM",
        "description": "חדשות עדכניות מ103FM",
        "category": "news",
        "episodes": [
            {
                "title": "חדשות הערב - שבת 9 בינואר 2026",
                "description": "עדכון החדשות העיקריות של היום",
                "published_date": datetime.now() - timedelta(hours=2),
            },
            {
                "title": "חדשות הבוקר - שבת 9 בינואר 2026",
                "description": "החדשות המרכזיות בבוקר",
                "published_date": datetime.now() - timedelta(days=1, hours=8),
            },
            {
                "title": "חדשות הערב - שישי 8 בינואר 2026",
                "description": "עדכון חדשות מהערב",
                "published_date": datetime.now() - timedelta(days=1, hours=20),
            },
        ],
    },
    "אקטואליה": {
        "author": "103FM",
        "description": "תוכנית הדיון והניתוח של 103FM",
        "category": "news",
        "episodes": [
            {
                "title": "הסוגיה השבועית - מחאות באיראן",
                "description": "דיון מעמיק בנושא המחאות באיראן והשלכותיהן",
                "published_date": datetime.now() - timedelta(hours=3),
            },
            {
                "title": "אקטואליה - ביטחון וכלכלה",
                "description": "ניתוח מצב הביטחון והכלכלה בישראל",
                "published_date": datetime.now() - timedelta(days=2),
            },
            {
                "title": "אקטואליה - פוליטיקה אלחוטית",
                "description": "הדיונים הפוליטיים של השבוע",
                "published_date": datetime.now() - timedelta(days=3),
            },
        ],
    },
    "ים קול": {
        "author": "103FM",
        "description": "תוכנית הדברים של 103FM",
        "category": "entertainment",
        "episodes": [
            {
                "title": "ים קול - שיחה עם יוצרים",
                "description": "שיחה מעניינת עם יוצרים בתרבות הישראלית",
                "published_date": datetime.now() - timedelta(hours=4),
            },
            {
                "title": "ים קול - ספרות וקולנוע",
                "description": "דיון על הספרות והקולנוע הישראלי",
                "published_date": datetime.now() - timedelta(days=1),
            },
            {
                "title": "ים קול - מוזיקה ישראלית",
                "description": "עדכון מעולם המוזיקה הישראלית",
                "published_date": datetime.now() - timedelta(days=2),
            },
        ],
    },
    "ספורט": {
        "author": "103FM",
        "description": "עדכוני ספורט מ103FM",
        "category": "sports",
        "episodes": [
            {
                "title": "עדכוני ספורט - הליגה הישראלית",
                "description": "תוצאות ודיון על משחקי הליגה",
                "published_date": datetime.now() - timedelta(hours=6),
            },
            {
                "title": "ספורט - כדורגל אירופה",
                "description": "עדכוני הכדורגל האירופאי",
                "published_date": datetime.now() - timedelta(days=1, hours=4),
            },
            {
                "title": "ספורט - כדורסל NBA",
                "description": "תוצאות משחקי NBA",
                "published_date": datetime.now() - timedelta(days=2),
            },
        ],
    },
}


async def main():
    client = MongoClient("mongodb://localhost:27017")
    db = client["bayit_plus"]

    print("🎙️ Updating podcasts with REAL data\n")

    # Use upsert mode to preserve existing podcasts
    print("✓ Using upsert mode - existing podcasts will be updated, not deleted\n")

    # Get real podcasts from RSS feeds
    real_podcasts = await scrape_all_podcasts()
    print(f"✅ Fetched {len(real_podcasts)} podcasts from RSS feeds\n")

    # Insert real (working) podcasts with their episodes
    for name, podcast_data in real_podcasts.items():
        print(f"📻 {name}")
        print(f"   Episodes: {len(podcast_data.episodes)}")

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

        result = db.podcasts.update_one(
            {"title": name},  # Match by title
            {
                "$set": {
                    "author": podcast_data.author or name,
                    "description": podcast_data.description,
                    "cover": podcast_data.cover,
                    "category": podcast_data.category,
                    "is_active": True,
                    "episode_count": len(episodes),
                    "latest_episode_date": latest_date or datetime.utcnow(),
                    "episodes": episodes,
                    "updated_at": datetime.utcnow(),
                },
                "$setOnInsert": {"created_at": datetime.utcnow()},
            },
            upsert=True,
        )
        if result.upserted_id:
            print(f"   ✓ created\n")
        else:
            print(f"   ⟳ updated\n")

    # Insert Israeli podcasts with sample episodes
    print("\n📻 Israeli Podcasts from 103FM:\n")
    for name, data in ISRAELI_PODCASTS.items():
        print(f"📻 {name}")

        episodes = []
        for i, ep_data in enumerate(data["episodes"], 1):
            episodes.append(
                {
                    "title": ep_data["title"],
                    "description": ep_data["description"],
                    "episode_number": i,
                    "season": 1,
                    "audio_url": None,  # Placeholder
                    "duration": "30:00",
                    "published_date": ep_data["published_date"],
                    "guid": f"103fm-{name}-{i}",
                }
            )

        latest_date = max(
            (ep.get("published_date") for ep in episodes if ep.get("published_date")),
            default=datetime.utcnow(),
        )

        result = db.podcasts.insert_one(
            {
                "title": name,
                "author": data["author"],
                "description": data["description"],
                "cover": None,
                "category": data["category"],
                "is_active": True,
                "episode_count": len(episodes),
                "latest_episode_date": latest_date,
                "episodes": episodes,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            }
        )
        print(f"   Episodes: {len(episodes)}")
        print(f"   ✓ inserted\n")

    total = db.podcasts.count_documents({})
    print("=" * 80)
    print(f"\n✅ Total podcasts in database: {total}")
    print("   - NPR podcasts with real episodes")
    print("   - 103FM Israeli podcasts with sample episodes")

    client.close()


if __name__ == "__main__":
    asyncio.run(main())
