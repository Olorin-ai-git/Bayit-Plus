"""
Seed script to populate Bayit+ database with sample content.
Run with: python -m scripts.seed_data
"""

import asyncio
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
import argparse

# Import models
import sys
sys.path.append('.')

from app.models.content import Content, , LiveChannel, EPGEntry, RadioStation, Podcast, PodcastEpisode
from app.models.content_taxonomy import ContentSection
from app.models.user import User
from app.core.config import settings
from app.core.security import get_password_hash


async def seed_database(clear_existing=False):
    """Seed the database with sample content."""

    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    await init_beanie(
        database=client[settings.MONGODB_DB_NAME],
        document_models=[
            User, Content, Category, LiveChannel, EPGEntry,
            RadioStation, Podcast, PodcastEpisode
        ],
    )

    print("Connected to MongoDB. Starting seed...")

    # Clear existing data only if explicitly requested
    if clear_existing:
        print("\n⚠️  WARNING: Clearing all existing data...")
        response = input("Are you ABSOLUTELY sure? Type 'DELETE ALL' to confirm: ")
        if response == "DELETE ALL":
            await Category.delete_all()
            await Content.delete_all()
            await LiveChannel.delete_all()
            await EPGEntry.delete_all()
            await RadioStation.delete_all()
            await Podcast.delete_all()
            await PodcastEpisode.delete_all()
            print("✓ Cleared existing data.")
        else:
            print("✗ Deletion cancelled. Proceeding with upsert operations...")
    else:
        print("Using upsert mode - existing data will be preserved.")

    # =====================
    # CATEGORIES
    # =====================
    categories_data = [
        {"name": "סרטים ישראליים", "name_en": "Israeli Movies", "slug": "israeli-movies", "order": 1},
        {"name": "דרמה", "name_en": "Drama", "slug": "drama", "order": 2},
        {"name": "קומדיה", "name_en": "Comedy", "slug": "comedy", "order": 3},
        {"name": "דוקומנטרי", "name_en": "Documentary", "slug": "documentary", "order": 4},
        {"name": "ילדים ומשפחה", "name_en": "Kids & Family", "slug": "kids-family", "order": 5},
        {"name": "חדשות ואקטואליה", "name_en": "News & Current Affairs", "slug": "news", "order": 6},
        {"name": "סדרות", "name_en": "TV Series", "slug": "series", "order": 7},
    ]

    categories = {}
    for cat_data in categories_data:
        # Use upsert logic - find existing or create new
        cat = await Category.find_one(Category.slug == cat_data["slug"])
        if not cat:
            cat = Category(**cat_data)
            await cat.insert()
            print(f"  ✓ Created category: {cat_data['name']}")
        else:
            print(f"  ⊙ Category exists: {cat_data['name']}")
        categories[cat_data["slug"]] = cat

    # =====================
    # VOD CONTENT
    # =====================
    content_data = [
        # Israeli Movies
        {
            "title": "וואלץ עם באשיר",
            "description": "סרט אנימציה דוקומנטרי ישראלי בבימויו של ארי פולמן. הסרט עוקב אחר פולמן בניסיונו לשחזר את זיכרונותיו האבודים ממלחמת לבנון הראשונה.",
            "thumbnail": "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400",
            "backdrop": "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200",
            "category_id": str(categories["israeli-movies"].id),
            "category_name": "סרטים ישראליים",
            "duration": "1:30:00",
            "year": 2008,
            "rating": "R",
            "genre": "אנימציה, דוקומנטרי",
            "director": "ארי פולמן",
            "cast": ["ארי פולמן", "רון בן-ישי", "דרור חרזי"],
            "stream_url": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
            "is_featured": True,
        },
        {
            "title": "להקת ביקור",
            "description": "תזמורת משטרה מצרית מגיעה לישראל לטקס פתיחה של מרכז תרבות ערבי, אך מוצאת את עצמה תקועה בעיירה נידחת בנגב.",
            "thumbnail": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400",
            "backdrop": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200",
            "category_id": str(categories["israeli-movies"].id),
            "category_name": "סרטים ישראליים",
            "duration": "1:27:00",
            "year": 2007,
            "rating": "PG",
            "genre": "דרמה, קומדיה",
            "director": "ערן קולירין",
            "stream_url": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
        },
        {
            "title": "אפוס",
            "description": "הסיפור של מייק ברנט, זמר יהודי-לבנוני שהפך לכוכב בינלאומי בשנות ה-70 וחייו הסתיימו בטרגדיה.",
            "thumbnail": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400",
            "backdrop": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200",
            "category_id": str(categories["documentary"].id),
            "category_name": "דוקומנטרי",
            "duration": "1:40:00",
            "year": 2020,
            "rating": "PG-13",
            "genre": "דוקומנטרי, מוזיקה",
            "stream_url": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
        },
        # Drama Series
        {
            "title": "פאודה - עונה 1",
            "description": "סדרת דרמה ישראלית העוסקת ביחידה מסתערבים של צה\"ל הפועלת בשטחים הכבושים.",
            "thumbnail": "https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=400",
            "backdrop": "https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=1200",
            "category_id": str(categories["drama"].id),
            "category_name": "דרמה",
            "duration": "12 פרקים",
            "year": 2015,
            "rating": "TV-MA",
            "genre": "דרמה, מתח",
            "is_series": True,
            "stream_url": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
        },
        {
            "title": "שטיסל - עונה 1",
            "description": "סדרת דרמה ישראלית העוקבת אחר משפחה חרדית בירושלים, ובמרכזה שולם שטיסל ובנו אקיבא.",
            "thumbnail": "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=400",
            "backdrop": "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=1200",
            "category_id": str(categories["drama"].id),
            "category_name": "דרמה",
            "duration": "12 פרקים",
            "year": 2013,
            "rating": "TV-14",
            "genre": "דרמה",
            "is_series": True,
            "stream_url": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
        },
        # Comedy
        {
            "title": "ארץ נהדרת - פרקים נבחרים",
            "description": "אוסף פרקים נבחרים מתוכנית הסאטירה הפוליטית הפופולרית בישראל.",
            "thumbnail": "https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=400",
            "backdrop": "https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=1200",
            "category_id": str(categories["comedy"].id),
            "category_name": "קומדיה",
            "duration": "45:00",
            "year": 2023,
            "rating": "TV-14",
            "genre": "קומדיה, סאטירה",
            "stream_url": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
        },
        {
            "title": "הכל כלול",
            "description": "קומדיה ישראלית על משפחה שיוצאת לחופשה במלון הכל כלול בטורקיה.",
            "thumbnail": "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400",
            "backdrop": "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200",
            "category_id": str(categories["comedy"].id),
            "category_name": "קומדיה",
            "duration": "1:35:00",
            "year": 2021,
            "rating": "PG-13",
            "genre": "קומדיה",
            "stream_url": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
        },
        # Kids
        {
            "title": "כיפה אדומה - גרסה ישראלית",
            "description": "עיבוד ישראלי אנימציוני לסיפור הילדים האהוב.",
            "thumbnail": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400",
            "backdrop": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200",
            "category_id": str(categories["kids-family"].id),
            "category_name": "ילדים ומשפחה",
            "duration": "1:10:00",
            "year": 2020,
            "rating": "G",
            "genre": "אנימציה, ילדים",
            "stream_url": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
        },
        # More content
        {
            "title": "התעודה",
            "description": "מותחן ישראלי על עיתונאי שחוקר רצח מסתורי.",
            "thumbnail": "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400",
            "backdrop": "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=1200",
            "category_id": str(categories["drama"].id),
            "category_name": "דרמה",
            "duration": "1:55:00",
            "year": 2022,
            "rating": "R",
            "genre": "מתח, דרמה",
            "stream_url": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
        },
        {
            "title": "גט",
            "description": "אישה ישראלית נלחמת לקבל גט מבעלה בבית הדין הרבני.",
            "thumbnail": "https://images.unsplash.com/photo-1515169067868-5387ec356754?w=400",
            "backdrop": "https://images.unsplash.com/photo-1515169067868-5387ec356754?w=1200",
            "category_id": str(categories["drama"].id),
            "category_name": "דרמה",
            "duration": "1:55:00",
            "year": 2014,
            "rating": "PG-13",
            "genre": "דרמה",
            "stream_url": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
        },
    ]

    for item in content_data:
        # Use upsert logic - find existing content by title or create new
        existing = await Content.find_one(Content.title == item["title"])
        if not existing:
            content = Content(**item)
            await content.insert()
            print(f"  ✓ Created content: {item['title']}")
        else:
            print(f"  ⊙ Content exists: {item['title']}")

    # =====================
    # LIVE CHANNELS
    # =====================
    channels_data = [
        {
            "name": "כאן 11",
            "description": "תאגיד השידור הישראלי - חדשות, תרבות ובידור",
            "thumbnail": "https://www.kan.org.il/media/lpadeq2p/%D7%9C%D7%95%D7%92%D7%95-%D7%9B%D7%90%D7%9F-%D7%A2%D7%9D-%D7%A1%D7%A8%D7%98-%D7%A6%D7%94%D7%95%D7%91.svg?rmode=pad&rnd=133624915040200000",
            "logo": "https://upload.wikimedia.org/wikipedia/he/thumb/1/14/Kan_11_Logo.svg/200px-Kan_11_Logo.svg.png",
            "stream_url": "https://kan11.media.kan.org.il/hls/live/2024514/2024514/master.m3u8",
            "current_show": "מבט לחדשות",
            "next_show": "הכל פוליטי",
            "order": 1,
        },
        {
            "name": "קשת 12",
            "description": "הערוץ המרכזי של קשת - בידור, דרמה וריאליטי",
            "thumbnail": "https://rcs.mako.co.il/images/headerV17/keshetLogoCut_150X72.jpg",
            "logo": "https://upload.wikimedia.org/wikipedia/he/thumb/6/67/Keshet_12_logo.svg/200px-Keshet_12_logo.svg.png",
            "stream_url": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
            "current_show": "חדשות 12",
            "next_show": "ארץ נהדרת",
            "order": 2,
        },
        {
            "name": "רשת 13",
            "description": "חדשות, ספורט ובידור",
            "thumbnail": "https://media.reshet.tv/image/upload/q_auto,f_auto,c_lpad,h_45,w_45/v1746345448/13_q8gehw.webp",
            "logo": "https://upload.wikimedia.org/wikipedia/he/thumb/4/45/Reshet_13_Logo.svg/200px-Reshet_13_Logo.svg.png",
            "stream_url": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
            "current_show": "חדשות 13",
            "next_show": "אולפן שישי",
            "order": 3,
        },
        {
            "name": "ערוץ 14",
            "description": "חדשות ואקטואליה",
            "thumbnail": "https://www.c14.co.il/_next/static/media/logo-c14.589a43b1.svg",
            "logo": "https://upload.wikimedia.org/wikipedia/he/thumb/4/4e/Channel_14_logo.svg/200px-Channel_14_logo.svg.png",
            "stream_url": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
            "current_show": "אולפן 14",
            "order": 4,
        },
        {
            "name": "i24NEWS Hebrew",
            "description": "חדשות בינלאומיות בעברית",
            "thumbnail": "https://cdn.one.accedo.tv/files/5a9413bf1de1c4000cc9fe08?sessionKey=01FFY88HAKAVC2J4X2QKT0PR6A18FD65D8F9#asset",
            "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/I24NEWS_logo.svg/200px-I24NEWS_logo.svg.png",
            "stream_url": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
            "current_show": "עדכון חדשות",
            "order": 5,
        },
        {
            "name": "כאן חינוכית",
            "description": "תכנים לילדים ונוער",
            "thumbnail": "https://www.kankids.org.il/media/0ymcnuw4/logo_hinuchit_main.svg",
            "stream_url": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
            "current_show": "שעת סיפור",
            "order": 6,
        },
    ]

    for ch_data in channels_data:
        channel = LiveChannel(**ch_data)
        await channel.insert()

        # Create EPG entries for today
        now = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
        shows = [
            "חדשות הבוקר", "תוכנית בוקר", "סדרה", "חדשות היום",
            "תוכנית אקטואליה", "סרט", "חדשות הערב", "תוכנית לילה"
        ]
        for i, show in enumerate(shows):
            epg = EPGEntry(
                channel_id=str(channel.id),
                title=show,
                description=f"תיאור עבור {show}",
                start_time=now + timedelta(hours=i*3),
                end_time=now + timedelta(hours=(i+1)*3),
            )
            await epg.insert()

        print(f"  Created channel: {ch_data['name']} with EPG")

    # =====================
    # RADIO STATIONS
    # =====================
    radio_data = [
        {
            "name": "גלי צה\"ל",
            "description": "תחנת הרדיו של צבא ההגנה לישראל",
            "logo": "https://upload.wikimedia.org/wikipedia/he/thumb/9/97/Galatz_logo.svg/200px-Galatz_logo.svg.png",
            "genre": "פופ, רוק, חדשות",
            "stream_url": "https://glzwizzlv.bynetcdn.com/glglz_mp3",
            "current_show": "הכל היה שווה",
            "order": 1,
        },
        {
            "name": "כאן 88",
            "description": "מוזיקה ישראלית ובינלאומית",
            "logo": "https://upload.wikimedia.org/wikipedia/he/thumb/a/a0/Kan_88_Logo.svg/200px-Kan_88_Logo.svg.png",
            "genre": "רוק, אלטרנטיבי",
            "stream_url": "https://kan88.media.kan.org.il/hls/live/2024688/2024688/master.m3u8",
            "current_show": "במה פתוחה",
            "order": 2,
        },
        {
            "name": "כאן גימל",
            "description": "מוזיקה ישראלית קלאסית",
            "logo": "https://upload.wikimedia.org/wikipedia/he/thumb/e/e4/Reshet_Gimmel_Logo.svg/200px-Reshet_Gimmel_Logo.svg.png",
            "genre": "ישראלי, קלאסי",
            "stream_url": "https://kangimel.media.kan.org.il/hls/live/2024690/2024690/master.m3u8",
            "current_show": "שירים ראשונים",
            "order": 3,
        },
        {
            "name": "רשת א'",
            "description": "חדשות, שיחות ותרבות",
            "genre": "דיבור, חדשות",
            "stream_url": "https://reshetalef.media.kan.org.il/hls/live/2024691/2024691/master.m3u8",
            "current_show": "בוקר טוב ישראל",
            "order": 4,
        },
        {
            "name": "103FM",
            "description": "הרדיו של תל אביב",
            "genre": "פופ, אלקטרוני",
            "stream_url": "https://103fm.live.streamgates.net/103fm_live/1031.stream/master.m3u8",
            "current_show": "הבוקר של 103",
            "order": 5,
        },
        {
            "name": "Eco 99FM",
            "description": "מוזיקה בינלאומית",
            "genre": "פופ, רוק",
            "stream_url": "https://eco99.media.eco99.net/live/master.m3u8",
            "current_show": "Top Hits",
            "order": 6,
        },
        {
            "name": "כאן קול המוזיקה",
            "description": "מוזיקה קלאסית",
            "genre": "קלאסית",
            "stream_url": "https://kankolhamusica.media.kan.org.il/hls/live/2024692/2024692/master.m3u8",
            "current_show": "קונצרט בוקר",
            "order": 7,
        },
    ]

    for radio in radio_data:
        station = RadioStation(**radio)
        await station.insert()
        print(f"  Created radio station: {radio['name']}")

    # =====================
    # PODCASTS
    # =====================
    podcasts_data = [
        {
            "title": "עושים היסטוריה",
            "description": "פודקאסט היסטוריה ישראלי פופולרי עם רן לוי. סיפורים מרתקים מההיסטוריה.",
            "author": "רן לוי",
            "cover": "https://images.unsplash.com/photo-1461360228754-6e81c478b882?w=400",
            "category": "היסטוריה",
            "episode_count": 450,
        },
        {
            "title": "עוגה על הפנים",
            "description": "פודקאסט קומדיה עם טל מרציאנו ותום נדרי",
            "author": "טל מרציאנו, תום נדרי",
            "cover": "https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=400",
            "category": "קומדיה",
            "episode_count": 200,
        },
        {
            "title": "הפודקאסט של שחר סגל",
            "description": "ראיונות מעמיקים עם אנשים מעניינים",
            "author": "שחר סגל",
            "cover": "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=400",
            "category": "ראיונות",
            "episode_count": 150,
        },
        {
            "title": "כאן כלכלה",
            "description": "סקירות כלכליות וניתוחים פיננסיים",
            "author": "כאן תאגיד השידור",
            "cover": "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400",
            "category": "כלכלה",
            "episode_count": 300,
        },
        {
            "title": "גיקטיים",
            "description": "פודקאסט על טכנולוגיה, גיימינג ותרבות פופ",
            "author": "ערן פלג",
            "cover": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400",
            "category": "טכנולוגיה",
            "episode_count": 500,
        },
        {
            "title": "הסודות של הנפש",
            "description": "פודקאסט פסיכולוגיה ובריאות הנפש",
            "author": "ד\"ר מיכל דלל",
            "cover": "https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=400",
            "category": "פסיכולוגיה",
            "episode_count": 180,
        },
    ]

    for pod_data in podcasts_data:
        podcast = Podcast(
            **pod_data,
            latest_episode_date=datetime.utcnow() - timedelta(days=3),
        )
        await podcast.insert()

        # Create episodes
        for i in range(5):
            episode = PodcastEpisode(
                podcast_id=str(podcast.id),
                title=f"פרק {pod_data['episode_count'] - i}: נושא מעניין",
                description=f"תיאור לפרק {pod_data['episode_count'] - i} של {pod_data['title']}",
                audio_url="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
                duration=f"{45 + i*5}:00",
                episode_number=pod_data['episode_count'] - i,
                published_at=datetime.utcnow() - timedelta(days=i*7),
            )
            await episode.insert()

        print(f"  Created podcast: {pod_data['title']} with 5 episodes")

    # =====================
    # TEST USER
    # =====================
    existing_user = await User.find_one(User.email == "test@example.com")
    if not existing_user:
        test_user = User(
            email="test@example.com",
            name="משתמש בדיקה",
            hashed_password=get_password_hash("password123"),
            subscription_tier="premium",
            subscription_status="active",
        )
        await test_user.insert()
        print("  Created test user: test@example.com / password123")

    print("\n✅ Seed completed successfully!")
    print("\nTest credentials:")
    print("  Email: test@example.com")
    print("  Password: password123")
    print("  Subscription: Premium")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Seed the Bayit+ database with sample content')
    parser.add_argument('--clear', action='store_true',
                        help='Clear existing data before seeding (DANGEROUS - requires confirmation)')
    args = parser.parse_args()

    asyncio.run(seed_database(clear_existing=args.clear))
