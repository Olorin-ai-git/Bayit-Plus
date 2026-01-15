import httpx
import asyncio

API_KEY = "cZR4Z0ac8JgPKZ4GUFHxi3icguKcpCO0"

async def test():
    # Test different URL formations
    tests = [
        ("https://api.opensubtitles.com/api/v1/subtitles", "URL with full path"),
        ("https://api.opensubtitles.com/api/v1" + "/subtitles", "URL with concatenation"),
    ]
    
    for url, desc in tests:
        print(f"\nTesting: {desc}")
        print(f"URL: {url}")
        
        client = httpx.AsyncClient(
            timeout=10.0,
            headers={
                "Api-Key": API_KEY,
                "User-Agent": "Bayit+ v1.0"
            }
        )
        
        response = await client.get(url, params={"imdb_id": "416449", "languages": "en"})
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Found {data.get('total_count', 0)} results")
        else:
            print(f"❌ {response.text[:100]}")
        
        await client.aclose()

asyncio.run(test())
