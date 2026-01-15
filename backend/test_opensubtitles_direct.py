"""
Direct OpenSubtitles API Test - Complete E2E
"""
import asyncio
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from app.services.opensubtitles_service import get_opensubtitles_service
from app.models.subtitles import SubtitleSearchCacheDoc, SubtitleTrackDoc, SubtitleQuotaTrackerDoc
from app.models.content import Content
from app.core.config import settings

async def init_db():
    """Initialize database with all models"""
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    
    await init_beanie(
        database=db,
        document_models=[
            SubtitleSearchCacheDoc,
            SubtitleTrackDoc,
            SubtitleQuotaTrackerDoc,
            Content
        ]
    )
    
    return client

async def test_movies():
    """Test downloading subtitles for movies"""
    service = get_opensubtitles_service()
    
    # Real movies from our database that need subtitles
    test_cases = [
        {"id": "69641ad8f7dfde7d50ef0a71", "title": "300", "year": 2006, "imdb_id": "tt0416449"},
        {"id": "696420716653cdd0ce6c8142", "title": "A Most Violent Year", "year": 2014, "imdb_id": "tt2937898"},
        {"id": "696418bdf7dfde7d50ef0a6e", "title": "Winnie the Pooh", "year": 2011, "imdb_id": "tt1449283"},
        {"id": "6964193ff7dfde7d50ef0a6f", "title": "25th Hour", "year": 2002, "imdb_id": "tt0307901"},
        {"id": "69641b44f7dfde7d50ef0a72", "title": "3:10 to Yuma", "year": 2007, "imdb_id": "tt0381849"},
    ]
    
    results_summary = {
        "tested": 0,
        "en_found": 0,
        "en_downloaded": 0,
        "he_found": 0,
        "he_downloaded": 0,
        "errors": []
    }
    
    for movie in test_cases:
        results_summary["tested"] += 1
        
        print(f"\n{'='*80}")
        print(f"🎬 {movie['title']} ({movie['year']}) - IMDB: {movie['imdb_id']}")
        print(f"{'='*80}")
        
        # Test English
        print("\n📥 Searching English...")
        try:
            en_results = await service.search_subtitles(
                imdb_id=movie['imdb_id'],
                language='en',
                content_id=movie['id']
            )
            
            if en_results and len(en_results) > 0:
                results_summary["en_found"] += 1
                print(f"   ✅ Found {len(en_results)} results")
                
                # Try download
                print(f"   🔄 Downloading file_id={en_results[0]['file_id']}...")
                subtitle_data = await service.download_subtitle(
                    file_id=en_results[0]['file_id'],
                    content_id=movie['id'],
                    language='en'
                )
                
                if subtitle_data and len(subtitle_data) > 100:
                    results_summary["en_downloaded"] += 1
                    lines = [l for l in subtitle_data.split('\n')[:10] if l.strip()]
                    print(f"   ✅ SUCCESS! {len(subtitle_data)} bytes")
                    print(f"   Preview: {lines[:3]}")
                else:
                    print(f"   ❌ Failed (returned {len(subtitle_data) if subtitle_data else 0} bytes)")
            else:
                print("   ℹ️  Not found")
        except Exception as e:
            error_msg = str(e)[:100]
            results_summary["errors"].append(f"EN-{movie['title']}: {error_msg}")
            print(f"   ❌ ERROR: {error_msg}")
        
        # Test Hebrew
        print("\n📥 Searching Hebrew...")
        try:
            he_results = await service.search_subtitles(
                imdb_id=movie['imdb_id'],
                language='he',
                content_id=movie['id']
            )
            
            if he_results and len(he_results) > 0:
                results_summary["he_found"] += 1
                print(f"   ✅ Found {len(he_results)} results")
                
                # Try download
                print(f"   🔄 Downloading file_id={he_results[0]['file_id']}...")
                subtitle_data = await service.download_subtitle(
                    file_id=he_results[0]['file_id'],
                    content_id=movie['id'],
                    language='he'
                )
                
                if subtitle_data and len(subtitle_data) > 100:
                    results_summary["he_downloaded"] += 1
                    lines = [l for l in subtitle_data.split('\n')[:10] if l.strip()]
                    print(f"   ✅ SUCCESS! {len(subtitle_data)} bytes")
                    print(f"   Preview: {lines[:3]}")
                else:
                    print(f"   ❌ Failed (returned {len(subtitle_data) if subtitle_data else 0} bytes)")
            else:
                print("   ℹ️  Not found")
        except Exception as e:
            error_msg = str(e)[:100]
            results_summary["errors"].append(f"HE-{movie['title']}: {error_msg}")
            print(f"   ❌ ERROR: {error_msg}")
        
        await asyncio.sleep(0.5)
    
    return results_summary

async def main():
    print("=" * 80)
    print("🧪 OPENSUBTITLES E2E TEST")
    print("=" * 80)
    
    print("\nInitializing database...")
    client = await init_db()
    print("✅ Database initialized\n")
    
    results = await test_movies()
    
    print("\n" + "=" * 80)
    print("📊 FINAL RESULTS")
    print("=" * 80)
    print(f"✅ Movies Tested: {results['tested']}")
    print(f"")
    print(f"📊 English Subtitles:")
    print(f"   Found:      {results['en_found']}/{results['tested']} ({results['en_found']/results['tested']*100:.0f}%)")
    print(f"   Downloaded: {results['en_downloaded']}/{results['en_found']} ({results['en_downloaded']/results['en_found']*100 if results['en_found'] > 0 else 0:.0f}%)")
    print(f"")
    print(f"📊 Hebrew Subtitles:")
    print(f"   Found:      {results['he_found']}/{results['tested']} ({results['he_found']/results['tested']*100:.0f}%)")
    print(f"   Downloaded: {results['he_downloaded']}/{results['he_found']} ({results['he_downloaded']/results['he_found']*100 if results['he_found'] > 0 else 0:.0f}%)")
    
    if results['errors']:
        print(f"\n⚠️  Errors ({len(results['errors'])}):")
        for err in results['errors'][:5]:
            print(f"   • {err}")
    
    print("=" * 80)
    
    # Overall assessment
    total_found = results['en_found'] + results['he_found']
    total_downloaded = results['en_downloaded'] + results['he_downloaded']
    
    if total_downloaded > 0:
        print("\n✅ OPENSUBTITLES API IS WORKING!")
        print(f"   Successfully downloaded {total_downloaded} subtitles")
    elif total_found > 0:
        print("\n⚠️  SEARCH WORKS BUT DOWNLOADS FAIL")
        print(f"   Found {total_found} subtitles but couldn't download them")
    else:
        print("\n❌ OPENSUBTITLES API NOT WORKING")
        print("   Could not find any subtitles")
    
    print("=" * 80)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(main())
