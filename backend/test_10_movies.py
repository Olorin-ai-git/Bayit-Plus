import asyncio
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from app.services.opensubtitles_service import get_opensubtitles_service
from app.models.subtitles import SubtitleSearchCacheDoc, SubtitleTrackDoc, SubtitleQuotaTrackerDoc
from app.models.content import Content
from app.core.config import settings

async def init_db():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    await init_beanie(database=db, document_models=[SubtitleSearchCacheDoc, SubtitleTrackDoc, SubtitleQuotaTrackerDoc, Content])
    return client

async def test_10_movies():
    client_db = await init_db()
    service = get_opensubtitles_service()
    
    movies = [
        {"id": "69641ad8f7dfde7d50ef0a71", "title": "300", "imdb": "tt0416449"},
        {"id": "696420716653cdd0ce6c8142", "title": "A Most Violent Year", "imdb": "tt2937898"},
        {"id": "696418bdf7dfde7d50ef0a6e", "title": "Winnie the Pooh", "imdb": "tt1449283"},
        {"id": "6964193ff7dfde7d50ef0a6f", "title": "25th Hour", "imdb": "tt0307901"},
        {"id": "69641b44f7dfde7d50ef0a72", "title": "3:10 to Yuma", "imdb": "tt0381849"},
        {"id": "69641b59f7dfde7d50ef0a73", "title": "A Good Day to Die Hard", "imdb": "tt1606378"},
        {"id": "69641c0df7dfde7d50ef0a74", "title": "A Little Chaos", "imdb": "tt2639254"},
        {"id": "69641cf0f7dfde7d50ef0a75", "title": "A Man Called Otto", "imdb": "tt7405458"},
        {"id": "696585efb0b67350385e6e2f", "title": "Independence Day", "imdb": "tt0362227"},
        {"id": "696569dfb0b67350385e6e2e", "title": "In The Land Of Saints", "imdb": "tt6966692"},
    ]
    
    results = {"en_found": 0, "en_downloaded": 0, "he_found": 0, "he_downloaded": 0}
    
    for i, movie in enumerate(movies, 1):
        print(f"\n[{i}/10] {movie['title']}")
        
        # Test English
        en = await service.search_subtitles(imdb_id=movie['imdb'], language='en', content_id=movie['id'])
        if en and len(en) > 0:
            results["en_found"] += 1
            print(f"  EN: ✅ Found {len(en)} results", end="")
            
            subtitle = await service.download_subtitle(file_id=str(en[0]['file_id']), content_id=movie['id'], language='en')
            if subtitle and len(subtitle) > 1000:
                results["en_downloaded"] += 1
                print(f" → Downloaded {len(subtitle)} bytes")
            else:
                print(f" → ❌ Download failed")
        else:
            print(f"  EN: Not found")
        
        # Test Hebrew  
        he = await service.search_subtitles(imdb_id=movie['imdb'], language='he', content_id=movie['id'])
        if he and len(he) > 0:
            results["he_found"] += 1
            print(f"  HE: ✅ Found {len(he)} results", end="")
            
            subtitle = await service.download_subtitle(file_id=str(he[0]['file_id']), content_id=movie['id'], language='he')
            if subtitle and len(subtitle) > 1000:
                results["he_downloaded"] += 1
                print(f" → Downloaded {len(subtitle)} bytes")
            else:
                print(f" → ❌ Download failed")
        else:
            print(f"  HE: Not found")
        
        await asyncio.sleep(0.3)
    
    print(f"\n{'='*80}")
    print(f"📊 RESULTS: EN={results['en_downloaded']}/{results['en_found']} | HE={results['he_downloaded']}/{results['he_found']}")
    print(f"{'='*80}")
    
    client_db.close()

asyncio.run(test_10_movies())
