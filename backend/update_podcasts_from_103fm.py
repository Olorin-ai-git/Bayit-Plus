"""
Update podcasts with REAL data from 103FM website.
Scrapes actual podcast names and creates them with sample episodes.
"""
import asyncio
from pymongo import MongoClient
from datetime import datetime, timedelta
import httpx
from bs4 import BeautifulSoup


async def scrape_103fm_podcasts():
    """Scrape real podcasts from 103FM website"""
    url = "https://103fm.maariv.co.il/%D7%94%D7%A4%D7%95%D7%93%D7%A7%D7%90%D7%A1%D7%98%D7%99%D7%9D-%D7%A9%D7%9C-%D7%A8%D7%93%D7%99%D7%95-103"

    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            response = await client.get(url, headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            })
            response.raise_for_status()

            soup = BeautifulSoup(response.text, "html.parser")

            # Find all program containers
            programs = soup.find_all("div", class_="program_speaker_name")

            podcasts = []
            for program in programs:
                title = program.get_text(strip=True)
                if title and len(title) > 2:
                    podcasts.append(title)

            return list(set(podcasts))

    except Exception as e:
        print(f"Error scraping 103FM: {e}")
        return []


def create_sample_episodes(podcast_name):
    """Create realistic sample episodes for a podcast"""
    return [
        {
            "title": f"{podcast_name} - חלק 1",
            "description": f"פרק ראשון של {podcast_name}",
            "episode_number": 1,
            "season": 1,
            "audio_url": None,
            "duration": "45:30",
            "published_date": datetime.now() - timedelta(hours=1),
            "guid": f"103fm-{podcast_name}-1",
        },
        {
            "title": f"{podcast_name} - חלק 2",
            "description": f"פרק שני של {podcast_name}",
            "episode_number": 2,
            "season": 1,
            "audio_url": None,
            "duration": "48:15",
            "published_date": datetime.now() - timedelta(days=1),
            "guid": f"103fm-{podcast_name}-2",
        },
        {
            "title": f"{podcast_name} - חלק 3",
            "description": f"פרק שלישי של {podcast_name}",
            "episode_number": 3,
            "season": 1,
            "audio_url": None,
            "duration": "42:00",
            "published_date": datetime.now() - timedelta(days=2),
            "guid": f"103fm-{podcast_name}-3",
        },
    ]


async def main():
    # Scrape real podcasts from 103FM
    print("🎙️ Scraping real podcasts from 103FM...\n")
    podcasts = await scrape_103fm_podcasts()
    print(f"✅ Found {len(podcasts)} podcasts\n")

    client = MongoClient("mongodb://localhost:27017")
    db = client["bayit_plus"]

    # Clear existing podcasts
    db.podcasts.delete_many({})
    print("✓ Cleared old podcasts\n")

    # Insert 103FM podcasts
    print("📻 Adding 103FM podcasts to database:\n")
    inserted = 0

    for podcast_name in sorted(podcasts):
        episodes = create_sample_episodes(podcast_name)

        latest_date = max(
            (ep.get("published_date") for ep in episodes if ep.get("published_date")),
            default=datetime.now(),
        )

        db.podcasts.insert_one(
            {
                "title": podcast_name,
                "author": "103FM",
                "description": f"{podcast_name} - פודקאסט ממחנון הרדיו הישראלי 103FM",
                "cover": None,
                "category": "news",  # Default category
                "is_active": True,
                "episode_count": len(episodes),
                "latest_episode_date": latest_date,
                "episodes": episodes,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            }
        )
        inserted += 1

        if inserted % 10 == 0:
            print(f"✓ Inserted {inserted} podcasts...")

    print(f"\n" + "=" * 80)
    print(f"\n✅ Successfully added {inserted} real 103FM podcasts!")
    print(f"   Each with 3 sample episodes")
    print(f"   Total episodes: {inserted * 3}")

    client.close()


if __name__ == "__main__":
    asyncio.run(main())
