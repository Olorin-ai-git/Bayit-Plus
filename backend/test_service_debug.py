import asyncio
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from app.models.subtitles import SubtitleSearchCacheDoc, SubtitleTrackDoc, SubtitleQuotaTrackerDoc
from app.models.content import Content
import httpx

async def init_db():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    await init_beanie(database=db, document_models=[SubtitleSearchCacheDoc, SubtitleTrackDoc, SubtitleQuotaTrackerDoc, Content])
    return client

async def test():
    client_db = await init_db()
    
    # Create service
    from app.services.opensubtitles_service import OpenSubtitlesService
    service = OpenSubtitlesService()
    
    print(f"API Key: {service.api_key[:20]}...")
    print(f"Base URL: {service.base_url}")
    print(f"Client headers: {dict(service.client.headers)}")
    
    # Direct test through service's client
    print(f"\n🧪 Direct test through service's httpx client:")
    url = f"{service.base_url}/subtitles"
    print(f"URL: {url}")
    
    response = await service.client.get(url, params={"imdb_id": "416449", "languages": "en"})
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Found {data.get('total_count', 0)} results")
        
        # Now test download
        file_id = data['data'][0]['attributes']['files'][0]['file_id']
        print(f"\n🔄 Testing download for file_id={file_id}")
        
        dl_response = await service.client.post(
            f"{service.base_url}/download",
            json={"file_id": file_id}
        )
        print(f"Download status: {dl_response.status_code}")
        
        if dl_response.status_code == 200:
            dl_data = dl_response.json()
            print(f"✅ Got link: {dl_data.get('link', '')[:80]}")
        else:
            print(f"❌ {dl_response.text[:200]}")
    
    client_db.close()

asyncio.run(test())
