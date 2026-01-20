"""
Import free content script
Imports free/test content from public sources directly to MongoDB
"""

import asyncio
import sys
sys.path.append('.')

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from datetime import datetime, timedelta

from app.models.content import Content, , LiveChannel, RadioStation, Podcast, PodcastEpisode
from app.models.content_taxonomy import ContentSection
from app.core.config import settings


async def import_free_content():
    """Import free content from public sources"""

    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    await init_beanie(
        database=client[settings.MONGODB_DB_NAME],
        document_models=[
            Category, Content, LiveChannel, RadioStation, Podcast, PodcastEpisode
        ],
    )

    print("Connected to MongoDB. Starting free content import...")

    # Get or create a general category
    general_cat = await Category.find_one(Category.slug == "free-content")
    if not general_cat:
        general_cat = Category(
            name="Free Content",
            name_en="Free Content",
            slug="free-content",
            description="Public domain and free test content",
            order=100,
            is_active=True
        )
        await general_cat.insert()
        print("  Created 'Free Content' category")
    else:
        print("  Using existing 'Free Content' category")

    # =====================
    # APPLE BIPBOP STREAMS (Live TV)
    # =====================
    print("\n📺 Importing Apple BipBop test streams...")

    bipbop_streams = [
        {
            "name": "Apple BipBop Basic",
            "description": "Apple's basic test HLS stream",
            "stream_url": "https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_4x3/bipbop_4x3_variant.m3u8",
            "stream_type": "hls",
            "is_drm_protected": False,
            "logo": "https://www.apple.com/favicon.ico",
        },
        {
            "name": "Apple BipBop Advanced (TS)",
            "description": "Apple's advanced test stream with Transport Stream segments",
            "stream_url": "https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_ts/master.m3u8",
            "stream_type": "hls",
            "is_drm_protected": False,
            "logo": "https://www.apple.com/favicon.ico",
        },
        {
            "name": "Apple BipBop (fMP4)",
            "description": "Apple's fragmented MP4 test stream",
            "stream_url": "https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8",
            "stream_type": "hls",
            "is_drm_protected": False,
            "logo": "https://www.apple.com/favicon.ico",
        },
    ]

    for i, stream_data in enumerate(bipbop_streams):
        channel = LiveChannel(
            name=stream_data["name"],
            description=stream_data.get("description", ""),
            logo=stream_data.get("logo", ""),
            stream_url=stream_data["stream_url"],
            stream_type=stream_data.get("stream_type", "hls"),
            is_drm_protected=stream_data.get("is_drm_protected", False),
            is_active=True,
            order=i + 1,
        )
        await channel.insert()
        print(f"  ✓ {stream_data['name']}")

    # =====================
    # PUBLIC DOMAIN MOVIES (VOD)
    # =====================
    print("\n🎬 Importing public domain movies...")

    public_domain_movies = [
        {
            "title": "Night of the Living Dead",
            "year": 1968,
            "description": "Classic zombie horror film. Public domain in the United States.",
            "director": "George A. Romero",
            "stream_url": "https://archive.org/download/night_of_the_living_dead/night_of_the_living_dead_512kb.mp4",
            "thumbnail": "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400",
            "genre": "Horror",
            "duration": "1:36:00",
            "rating": "Not Rated",
        },
        {
            "title": "His Girl Friday",
            "year": 1940,
            "description": "Classic screwball comedy. Public domain.",
            "director": "Howard Hawks",
            "stream_url": "https://archive.org/download/hgf_512kb.mp4/hgf_512kb.mp4",
            "thumbnail": "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400",
            "genre": "Comedy",
            "duration": "1:32:00",
            "rating": "Not Rated",
        },
        {
            "title": "Nosferatu",
            "year": 1922,
            "description": "Silent horror classic. Public domain.",
            "director": "F.W. Murnau",
            "stream_url": "https://archive.org/download/Nosferatu_1922/Nosferatu_1922_512kb.mp4",
            "thumbnail": "https://images.unsplash.com/photo-1474886226512-6d88abc41cea?w=400",
            "genre": "Horror",
            "duration": "1:33:00",
            "rating": "Not Rated",
        },
        {
            "title": "The Great Train Robbery",
            "year": 1903,
            "description": "Historic silent film - one of the first narrative films. Public domain.",
            "director": "Edwin S. Porter",
            "stream_url": "https://archive.org/download/TheGreatTrainRobbery/The%20Great%20Train%20Robbery%201903%20(512kb).mp4",
            "thumbnail": "https://images.unsplash.com/photo-1535016120754-881642120dd7?w=400",
            "genre": "Crime",
            "duration": "0:10:00",
            "rating": "Not Rated",
        },
    ]

    for movie_data in public_domain_movies:
        content = Content(
            title=movie_data["title"],
            description=movie_data.get("description", ""),
            thumbnail=movie_data.get("thumbnail", ""),
            director=movie_data.get("director"),
            stream_url=movie_data["stream_url"],
            stream_type="http",
            year=movie_data.get("year"),
            duration=movie_data.get("duration"),
            rating=movie_data.get("rating", "Not Rated"),
            genre=movie_data.get("genre", "Drama"),
            category_id=str(general_cat.id),
            category_name=general_cat.name,
            is_published=True,
            is_featured=False,
            is_kids_content=False,
        )
        await content.insert()
        print(f"  ✓ {movie_data['title']} ({movie_data.get('year', 'N/A')})")

    # =====================
    # PUBLIC RADIO STREAMS
    # =====================
    print("\n📻 Importing public radio streams...")

    radio_streams = [
        {
            "name": "Soma FM - Groove Salad",
            "description": "Eclectic selection of lounge, funk, soul and downtempo grooves",
            "genre": "Electronic",
            "stream_url": "https://somafm.com/groovesalad.pls",
            "logo": "https://somafm.com/img/logos/128/groovesalad.png",
        },
        {
            "name": "Soma FM - Drone Zone",
            "description": "Dreamy, ethereal, atmospheric and minimal pieces",
            "genre": "Ambient",
            "stream_url": "https://somafm.com/dronezone.pls",
            "logo": "https://somafm.com/img/logos/128/dronezone.png",
        },
        {
            "name": "BBC World Service",
            "description": "International news and current affairs",
            "genre": "News",
            "stream_url": "http://bbcwssc.akamaized.net/live/manifest/audio/en_wwws_drm_p.m3u8",
            "logo": "https://www.bbc.com/favicon.ico",
        },
    ]

    for i, station_data in enumerate(radio_streams):
        station = RadioStation(
            name=station_data["name"],
            description=station_data.get("description", ""),
            logo=station_data.get("logo", ""),
            genre=station_data.get("genre", "Music"),
            stream_url=station_data["stream_url"],
            stream_type="audio",
            is_active=True,
            order=i + 1,
        )
        await station.insert()
        print(f"  ✓ {station_data['name']}")

    # =====================
    # PUBLIC PODCASTS
    # =====================
    print("\n🎙️  Importing public podcasts...")

    public_podcasts = [
        {
            "title": "The Daily",
            "author": "The New York Times",
            "description": "Hosted by Michael Barbaro. A daily show from The New York Times.",
            "rss_feed": "https://feeds.simplecast.com/54nAGcIl",
            "website": "https://www.nytimes.com/podcasts/the-daily",
            "cover": "https://images.unsplash.com/photo-1505373877841-8a5e1b311bba?w=400",
            "category": "News",
        },
        {
            "title": "Up First",
            "author": "NPR",
            "description": "NPR's newscast in a daily, five to ten minute news podcast format.",
            "rss_feed": "https://feeds.npr.org/510318/rss.xml",
            "website": "https://www.npr.org/podcasts/510318/up-first",
            "cover": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400",
            "category": "News",
        },
        {
            "title": "Science Vs",
            "author": "Gimlet Media",
            "description": "Exploring everyday myths and claims. Hosted by Wendy Zukerman.",
            "rss_feed": "https://feeds.gimletmedia.com/sciencevs",
            "website": "https://www.sciencevspodcast.com/",
            "cover": "https://images.unsplash.com/photo-1516321318423-f06f70d504f0?w=400",
            "category": "Science",
        },
    ]

    podcast_count = await Podcast.find().count()
    for idx, podcast_data in enumerate(public_podcasts):
        podcast = Podcast(
            title=podcast_data["title"],
            author=podcast_data.get("author"),
            description=podcast_data.get("description", ""),
            cover=podcast_data.get("cover", ""),
            category=podcast_data.get("category", "News"),
            rss_feed=podcast_data.get("rss_feed"),
            website=podcast_data.get("website"),
            is_active=True,
            episode_count=0,
            order=podcast_count + idx + 1,
        )
        await podcast.insert()
        print(f"  ✓ {podcast_data['title']}")

    print("\n" + "="*50)
    print("✅ Free content import completed successfully!")
    print("="*50)
    print("\nImported:")
    print(f"  - 3 Apple BipBop test streams (Live TV)")
    print(f"  - 4 Public domain movies (VOD)")
    print(f"  - 3 Public radio streams (Radio)")
    print(f"  - 3 Public podcasts")

    client.close()


if __name__ == "__main__":
    asyncio.run(import_free_content())
