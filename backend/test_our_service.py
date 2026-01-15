"""Test our fixed OpenSubtitles service"""
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
    await init_beanie(
        database=db,
        document_models=[SubtitleSearchCacheDoc, SubtitleTrackDoc, SubtitleQuotaTrackerDoc, Content]
    )
    return client

async def test():
    client = await init_db()
    service = get_opensubtitles_service()
    
    print("🧪 Testing OUR OpenSubtitles Service\n")
    
    # Test 1: Search
    print("1️⃣  Search for '300' (IMDB: tt0416449)")
    results = await service.search_subtitles(
        imdb_id="tt0416449",
        language='en'
    )
    
    if results and len(results) > 0:
        print(f"   ✅ Found {len(results)} results")
        file_id = results[0]['file_id']
        print(f"   File ID: {file_id}")
        
        # Test 2: Download
        print(f"\n2️⃣  Download subtitle (file_id={file_id})")
        subtitle_text = await service.download_subtitle(
            file_id=str(file_id),
            content_id="69641ad8f7dfde7d50ef0a71",
            language='en'
        )
        
        if subtitle_text and len(subtitle_text) > 100:
            lines = [l for l in subtitle_text.split('\n')[:10] if l.strip()]
            print(f"   ✅ SUCCESS! Downloaded {len(subtitle_text)} bytes")
            print(f"   First lines:")
            for line in lines[:5]:
                print(f"     {line}")
        else:
            print(f"   ❌ Failed (got {len(subtitle_text) if subtitle_text else 0} bytes)")
    else:
        print("   ❌ No results")
    
    client.close()
    print(f"\n✅ TEST COMPLETE")

asyncio.run(test())
