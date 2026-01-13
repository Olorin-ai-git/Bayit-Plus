#!/usr/bin/env python3
"""
Compare movies in USB drive with MongoDB database.
Shows which movies are missing from the database.
"""

import os
import sys
from pathlib import Path
import asyncio

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.content import Content, Category
from app.core.config import settings


async def compare_movies(source_dir: str):
    """Compare movies in drive with database."""
    source_path = Path(source_dir)

    if not source_path.exists():
        print(f"ERROR: Source directory not found: {source_dir}")
        return

    print(f"Scanning directory: {source_dir}")

    # Initialize database
    mongodb_url = os.environ.get('MONGODB_URL') or settings.MONGODB_URL
    if 'localhost' in mongodb_url:
        mongodb_url = 'mongodb+srv://admin_db_user:Jersey1973!@cluster0.ydrvaft.mongodb.net/bayit_plus?retryWrites=true&w=majority'

    client = AsyncIOMotorClient(mongodb_url)
    db = client['bayit_plus']
    await init_beanie(
        database=db,
        document_models=[Content, Category]
    )
    print("Connected to MongoDB Atlas\n")

    # Get all movies from database
    all_contents = await Content.find_all().to_list()
    db_titles = {content.title.lower() for content in all_contents}
    print(f"Found {len(db_titles)} movies in database")

    # Collect movie files from USB
    video_extensions = {'.mp4', '.mkv', '.avi', '.mov', '.webm', '.m4v'}
    movie_files = []

    for item in os.listdir(source_dir):
        item_path = os.path.join(source_dir, item)

        if os.path.isdir(item_path):
            # Look for video files in subdirectory
            for subitem in os.listdir(item_path):
                if Path(subitem).suffix.lower() in video_extensions:
                    movie_files.append((item, subitem, item_path))
                    break
        elif Path(item).suffix.lower() in video_extensions:
            # Direct video file
            movie_files.append((item, item, source_dir))

    print(f"Found {len(movie_files)} movies on USB drive\n")

    # Compare
    missing_from_db = []
    in_db = []

    for folder_name, filename, _ in movie_files:
        # Use folder name for comparison (more reliable than filename)
        title = folder_name.replace('_', ' ').replace('.', ' ')
        title_lower = title.lower()

        # Simple check if any database title contains this title or vice versa
        found = any(
            title_lower in db_title or db_title in title_lower
            for db_title in db_titles
        )

        if found:
            in_db.append(folder_name)
        else:
            missing_from_db.append((folder_name, filename))

    # Print results
    print("="*80)
    print(f"SUMMARY:")
    print(f"  Total movies on USB: {len(movie_files)}")
    print(f"  Already in database: {len(in_db)}")
    print(f"  Missing from database: {len(missing_from_db)}")
    print("="*80)

    if missing_from_db:
        print(f"\nMISSING FROM DATABASE ({len(missing_from_db)} movies):")
        print("-"*80)
        for i, (folder, filename) in enumerate(sorted(missing_from_db), 1):
            print(f"{i}. {folder}")
            print(f"   File: {filename}")
    else:
        print("\nAll movies from USB drive are in the database!")

    print("\n" + "="*80)


if __name__ == '__main__':
    asyncio.run(compare_movies('/Volumes/USB Drive/Movies'))
