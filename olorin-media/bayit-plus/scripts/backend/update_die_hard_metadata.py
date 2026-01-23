#!/usr/bin/env python3
"""
Update metadata for "A Good Day to Die Hard"
This movie failed TMDB search during the audit, so we're updating it manually
"""
import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings


async def update_die_hard_metadata():
    """Update A Good Day to Die Hard with provided metadata"""
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    
    # Initialize Beanie
    from beanie import init_beanie
    from app.models.content import Content, 
from app.models.content_taxonomy import ContentSection
    
    await init_beanie(
        database=db,
        document_models=[Content, Category]
    )
    
    print("╔" + "=" * 78 + "╗")
    print("║" + " " * 20 + "Update A Good Day to Die Hard" + " " * 29 + "║")
    print("╚" + "=" * 78 + "╝")
    print()
    
    # Find the movie
    print("🔍 Searching for 'A Good Day to Die Hard'...")
    content = await Content.find_one(
        Content.title == "A Good Day to Die Hard"
    )
    
    if not content:
        # Try case-insensitive search
        all_content = await Content.find_all().to_list()
        for item in all_content:
            if item.title and "good day to die hard" in item.title.lower():
                content = item
                break
    
    if not content:
        print("❌ Movie not found in database")
        print("   Searching for similar titles...")
        
        all_content = await Content.find_all().to_list()
        die_hard_movies = [
            c for c in all_content 
            if c.title and "die hard" in c.title.lower()
        ]
        
        if die_hard_movies:
            print(f"\n   Found {len(die_hard_movies)} Die Hard movies:")
            for movie in die_hard_movies:
                print(f"   - {movie.title} (ID: {movie.id})")
        
        await client.close()
        return
    
    print(f"✅ Found: {content.title}")
    print(f"   ID: {content.id}")
    print()
    
    # Display current metadata
    print("📋 CURRENT METADATA:")
    print(f"   Title: {content.title}")
    print(f"   Description: {content.description[:100] if content.description else 'None'}...")
    print(f"   Cast: {content.cast if content.cast else 'None'}")
    print(f"   Director: {content.director if content.director else 'None'}")
    print(f"   Genres: {content.genres if content.genres else 'None'}")
    print(f"   Release Year: {content.year if content.year else 'None'}")
    print(f"   IMDB ID: {content.imdb_id if content.imdb_id else 'None'}")
    print(f"   IMDB Rating: {content.imdb_rating if content.imdb_rating else 'None'}")
    print(f"   TMDB ID: {content.tmdb_id if content.tmdb_id else 'None'}")
    print()
    
    # Prepare updated metadata
    print("📝 UPDATING METADATA:")
    
    # Cast
    new_cast = ["Bruce Willis", "Jai Courtney", "Sebastian Koch", "Yulia Snigir", 
                "Cole Hauser", "Amaury Nolasco", "Radivoje Bukvić"]
    content.cast = new_cast
    print(f"   ✅ Cast: {', '.join(new_cast[:3])}... ({len(new_cast)} actors)")
    
    # Director
    content.director = "John Moore"
    print(f"   ✅ Director: John Moore")
    
    # Genres
    content.genres = ["Action", "Thriller"]
    content.genre = "Action"  # Primary genre
    print(f"   ✅ Genres: Action, Thriller")
    
    # Release year
    content.year = 2013
    print(f"   ✅ Release Year: 2013")
    
    # IMDB
    content.imdb_id = "tt1606378"
    content.imdb_rating = 5.2
    print(f"   ✅ IMDB: tt1606378 (Rating: 5.2)")
    
    # TMDB
    content.tmdb_id = 47964
    print(f"   ✅ TMDB ID: 47964")
    
    # Content type
    content.content_type = "movie"
    print(f"   ✅ Content Type: movie")
    
    # Description (if missing)
    if not content.description:
        content.description = (
            "John McClane travels to Russia to help out his seemingly wayward son, Jack, "
            "only to discover that Jack is a CIA operative working undercover, causing the "
            "father and son to team up against underworld forces."
        )
        print(f"   ✅ Description: Updated")
    
    # Duration (if missing)
    if not content.duration:
        content.duration = "1:38:00"
        print(f"   ✅ Duration: 1:38:00")
    
    # Poster (TMDB poster URL)
    if not content.poster_url:
        content.poster_url = "https://image.tmdb.org/t/p/w500/c2SQMd00CCGTiDxGXVqA2J9lmzF.jpg"
        content.thumbnail = "https://image.tmdb.org/t/p/w500/c2SQMd00CCGTiDxGXVqA2J9lmzF.jpg"
        print(f"   ✅ Poster: Added from TMDB")
    
    # Backdrop
    if not content.backdrop:
        content.backdrop = "https://image.tmdb.org/t/p/w1280/17zArExB7ztm6fjUXZwQWgGMC9f.jpg"
        print(f"   ✅ Backdrop: Added from TMDB")
    
    # Save changes
    print()
    print("💾 Saving changes to database...")
    
    from datetime import datetime
    content.updated_at = datetime.utcnow()
    
    await content.save()
    
    print("✅ Metadata updated successfully!")
    print()
    
    # Display updated metadata
    print("📊 UPDATED METADATA:")
    print(f"   Title: {content.title}")
    print(f"   Cast: {', '.join(content.cast)}")
    print(f"   Director: {content.director}")
    print(f"   Genres: {', '.join(content.genres)}")
    print(f"   Year: {content.year}")
    print(f"   IMDB: {content.imdb_id} (Rating: {content.imdb_rating})")
    print(f"   TMDB: {content.tmdb_id}")
    print(f"   Content Type: {content.content_type}")
    print(f"   Duration: {content.duration}")
    print(f"   Poster: {'✅' if content.poster_url else '❌'}")
    print(f"   Backdrop: {'✅' if content.backdrop else '❌'}")
    print()
    
    print("╚" + "=" * 78 + "╝")
    
    if client:
        client.close()  # Motor client.close() is synchronous


if __name__ == "__main__":
    asyncio.run(update_die_hard_metadata())
