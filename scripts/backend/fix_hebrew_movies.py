#!/usr/bin/env python3
"""
Fix Hebrew-named movies in MongoDB and GCS.

This script:
1. Finds all movies with Hebrew titles in MongoDB
2. Maps them to English titles
3. Fetches TMDB metadata using English titles
4. Updates MongoDB entries with English titles and TMDB metadata
5. Deletes macOS resource fork (._) entries
"""

import os
import sys
import asyncio
import logging
import re
from typing import Optional, Dict

# Add backend directory to path
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(os.path.dirname(script_dir))
backend_dir = os.path.join(project_root, 'backend')
sys.path.insert(0, backend_dir)

from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Hebrew to English title mapping with year
HEBREW_TO_ENGLISH = {
    "הבלתי רגיל": ("The Incredibles", 2004),
    "מקס הזועם 1": ("Mad Max", 1979),
    "מקס הזועם": ("Mad Max", 1979),
    "נוכלות בלי חשבון": ("The Hustle", 2019),
    "כשהשלג יורד": ("When It Snows", None),
    "למה זה מגיע לי 2": ("Despicable Me 2", 2013),
    "למה זה מגיע לי": ("Despicable Me", 2010),
    "ספיידרמן מימד העכביש": ("Spider-Man Into the Spider-Verse", 2018),
    "הרקולס האגדה מתחילה": ("The Legend of Hercules", 2014),
    "הרקולס_ האגדה מתחילה": ("The Legend of Hercules", 2014),
    "משפחת סופר על 2": ("Incredibles 2", 2018),
    "משפחת סופר על": ("The Incredibles", 2004),
    "מלחמת הכוכבים 9": ("Star Wars The Rise of Skywalker", 2019),
    "גשם של פלאפל 2": ("Cloudy with a Chance of Meatballs 2", 2013),
    "גשם של פלאפל": ("Cloudy with a Chance of Meatballs", 2009),
    "לשבור את הקרח 2": ("Frozen 2", 2019),
    "לשבור את הקרח": ("Frozen", 2013),
    "עלייתו של האביר האפלה": ("The Dark Knight Rises", 2012),
    "גודזילה מלך המפלצות": ("Godzilla King of the Monsters", 2019),
    "הקיץ האחרון": ("The Last Summer", 2019),
    "אלכס חולה אהבה": ("Alex Holeh Ahava", 2012),
    "מרי פופינס חוזרת": ("Mary Poppins Returns", 2018),
    "אמיצה מתורגם": ("Brave", 2012),
    "אמיצה": ("Brave", 2012),
    "הנוקמים מלחמת האינסוף": ("Avengers Infinity War", 2018),
    "הנוקמים 4": ("Avengers Endgame", 2019),
    "הנוקמים": ("The Avengers", 2012),
    "אנטמן והצרעה": ("Ant-Man and the Wasp", 2018),
    "אנטמן 2": ("Ant-Man and the Wasp", 2018),
    "אנטמן": ("Ant-Man", 2015),
    "אני זוכר": ("I Remember", None),
    "יומנה של אנה פרנק": ("The Diary of Anne Frank", 1959),
    "מוצאים את דורי": ("Finding Dory", 2016),
    "הדרקון הראשון שלי 2": ("How to Train Your Dragon 2", 2014),
    "הדרקון הראשון שלי": ("How to Train Your Dragon", 2010),
    "קפטן אמריקה 1": ("Captain America The First Avenger", 2011),
    "קפטן אמריקה": ("Captain America The First Avenger", 2011),
    "בחזרה לעתיד 1": ("Back to the Future", 1985),
    "בחזרה לעתיד 3": ("Back to the Future Part III", 1990),
    "בחזרה לעתיד": ("Back to the Future", 1985),
    "אסקימו לימון 9": ("Lemon Popsicle 9 The Party Goes On", 2001),
    "ספר הג'ונגל": ("The Jungle Book", 2016),
    "סופרמן 1": ("Superman", 1978),
    "סופרמן 3": ("Superman III", 1983),
    "סופרמן": ("Superman", 1978),
    "שהאזאם": ("Shazam", 2019),
    "דמבו": ("Dumbo", 2019),
    "למעלה": ("Up", 2009),
    "גו'מנגי השלב הבא": ("Jumanji The Next Level", 2019),
    "ג'וקר": ("Joker", 2019),
}

NOISE_WORDS = [
    "סרטים וסדרות בדרייב איילת השחר",
    "סרטים וסדרות בדרייב עי יוסף",
    "סרטים וסדרות בדרייב",
    "של סרטים וסדרות בדרייב",
    "של @DriveTv בטלגרם",
    "מתורגם",
    "תרגום לעברית",
    "מדובב ותרגום לעברית",
    "HDRip 1080p",
    " של ",
]

HEBREW_PATTERN = re.compile(r'[\u0590-\u05FF]')


def has_hebrew(text: str) -> bool:
    """Check if text contains Hebrew characters."""
    return bool(HEBREW_PATTERN.search(text))


def clean_hebrew_title(title: str) -> str:
    """Remove noise words from Hebrew title."""
    cleaned = title
    for noise in sorted(NOISE_WORDS, key=len, reverse=True):
        cleaned = cleaned.replace(noise, '')
    cleaned = cleaned.strip().rstrip('_ .')
    return cleaned


def match_hebrew_to_english(title: str) -> Optional[tuple]:
    """Match a Hebrew title to its English equivalent."""
    cleaned = clean_hebrew_title(title)

    if cleaned in HEBREW_TO_ENGLISH:
        return HEBREW_TO_ENGLISH[cleaned]

    for hebrew, english_tuple in sorted(
        HEBREW_TO_ENGLISH.items(), key=lambda x: len(x[0]), reverse=True
    ):
        if hebrew in cleaned:
            return english_tuple

    return None


async def fetch_tmdb_metadata(title: str, year: Optional[int] = None) -> Optional[Dict]:
    """Fetch movie metadata from TMDB."""
    import httpx

    if not settings.TMDB_API_KEY:
        logger.warning("TMDB_API_KEY not configured")
        return None

    try:
        async with httpx.AsyncClient() as client:
            params = {'api_key': settings.TMDB_API_KEY, 'query': title}
            if year:
                params['year'] = year
            resp = await client.get(
                'https://api.themoviedb.org/3/search/movie',
                params=params,
            )
            data = resp.json()
            if data.get('results'):
                movie = data['results'][0]
                poster = (
                    f"https://image.tmdb.org/t/p/w500{movie['poster_path']}"
                    if movie.get('poster_path')
                    else None
                )
                backdrop = (
                    f"https://image.tmdb.org/t/p/original{movie['backdrop_path']}"
                    if movie.get('backdrop_path')
                    else None
                )
                release_year = None
                if movie.get('release_date'):
                    try:
                        release_year = int(movie['release_date'][:4])
                    except (ValueError, IndexError):
                        pass

                return {
                    'title': movie.get('title', title),
                    'description': movie.get('overview', ''),
                    'thumbnail': poster,
                    'backdrop': backdrop,
                    'year': release_year,
                    'rating': movie.get('vote_average'),
                    'tmdb_id': movie.get('id'),
                }
    except Exception as e:
        logger.error(f"TMDB fetch failed for '{title}': {e}")
    return None


async def main():
    """Find and fix Hebrew-named movies in the database."""
    logger.info("Connecting to MongoDB...")
    mongo_uri = str(settings.MONGODB_URI) if hasattr(settings, 'MONGODB_URI') else str(settings.MONGODB_URL)
    client = AsyncIOMotorClient(mongo_uri)
    db = client[settings.MONGODB_DB_NAME]
    collection = db['content']

    # Find all content with Hebrew characters in title using regex
    hebrew_regex = {'$regex': '[\u0590-\u05FF]'}
    cursor = collection.find({'title': hebrew_regex})
    hebrew_movies = await cursor.to_list(length=1000)

    logger.info(f"Found {len(hebrew_movies)} movies with Hebrew titles")

    # Separate resource forks from real movies
    resource_forks = []
    real_movies = []
    for movie in hebrew_movies:
        stream_url = movie.get('stream_url', '') or ''
        if '/._' in stream_url:
            resource_forks.append(movie)
        else:
            real_movies.append(movie)

    logger.info(f"  Real movies: {len(real_movies)}")
    logger.info(f"  Resource forks (._): {len(resource_forks)}")

    # Delete resource fork entries
    for rf in resource_forks:
        logger.info(f"  Deleting resource fork: {rf.get('title', 'unknown')} (id: {rf['_id']})")
        await collection.delete_one({'_id': rf['_id']})
    logger.info(f"Deleted {len(resource_forks)} resource fork entries")

    # Fix real movies
    updated = 0
    failed = []
    for movie in real_movies:
        old_title = movie.get('title', '')
        match = match_hebrew_to_english(old_title)

        if match:
            english_title, year = match
            logger.info(f"  Matched: '{old_title}' -> '{english_title}' ({year})")

            tmdb = await fetch_tmdb_metadata(english_title, year)

            update_fields = {}
            if tmdb:
                update_fields['title'] = tmdb['title']
                if tmdb.get('description'):
                    update_fields['description'] = tmdb['description']
                if tmdb.get('thumbnail'):
                    update_fields['thumbnail'] = tmdb['thumbnail']
                if tmdb.get('backdrop'):
                    update_fields['backdrop'] = tmdb['backdrop']
                if tmdb.get('year'):
                    update_fields['year'] = tmdb['year']
                if tmdb.get('rating'):
                    update_fields['rating'] = tmdb['rating']
                if tmdb.get('tmdb_id'):
                    update_fields['tmdb_id'] = tmdb['tmdb_id']
                logger.info(f"    TMDB: '{tmdb['title']}' ({tmdb.get('year')})")
            else:
                update_fields['title'] = english_title
                if year:
                    update_fields['year'] = year
                logger.info(f"    No TMDB, using: '{english_title}'")

            await collection.update_one(
                {'_id': movie['_id']},
                {'$set': update_fields}
            )
            updated += 1
        else:
            logger.warning(f"  No match for: '{old_title}' (id: {movie['_id']})")
            failed.append(old_title)

    logger.info(f"\n=== SUMMARY ===")
    logger.info(f"Total Hebrew movies found: {len(hebrew_movies)}")
    logger.info(f"Resource forks deleted: {len(resource_forks)}")
    logger.info(f"Movies updated to English: {updated}")
    logger.info(f"Unmatched movies: {len(failed)}")
    if failed:
        for f in failed:
            logger.info(f"  - {f}")

    client.close()


if __name__ == '__main__':
    asyncio.run(main())
