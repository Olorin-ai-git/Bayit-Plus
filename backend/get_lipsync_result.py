import asyncio
import httpx
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from app.core.config import settings

async def get_result():
    lipsync_id = "65f1525f-931f-4dc5-94e8-13e0de085a22"
    api_url = settings.CREATIFY_API_URL
    headers = {
        "X-API-ID": settings.CREATIFY_API_ID,
        "X-API-KEY": settings.CREATIFY_API_KEY
    }
    
    async with httpx.AsyncClient(follow_redirects=True) as client:
        response = await client.get(
            f"{api_url}/api/lipsyncs/{lipsync_id}",
            headers=headers
        )
        result = response.json()
        print(f"Status: {result.get('status')}")
        print(f"Video URL: {result.get('output')}")
        print(f"Thumbnail: {result.get('video_thumbnail')}")
        print(f"\nFull response:")
        import json
        print(json.dumps(result, indent=2))

asyncio.run(get_result())
