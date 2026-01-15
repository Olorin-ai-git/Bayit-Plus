import httpx
import asyncio
import json

API_KEY = "cZR4Z0ac8JgPKZ4GUFHxi3icguKcpCO0"
BASE_URL = "https://api.opensubtitles.com/api/v1"

async def test_api():
    client = httpx.AsyncClient(
        timeout=30.0,
        headers={
            "Api-Key": API_KEY,
            "User-Agent": "Bayit+ v1.0",
            "Content-Type": "application/json"
        }
    )
    
    print("="*80)
    print("🧪 TESTING OPENSUBTITLES API")
    print("="*80)
    
    # Test 1: Search for subtitles
    print("\n1️⃣  Testing SEARCH (GET /subtitles)")
    try:
        response = await client.get(
            f"{BASE_URL}/subtitles",
            params={"imdb_id": "416449", "languages": "en"}  # 300 movie
        )
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Found {data.get('total_count', 0)} results")
            if data.get('data') and len(data['data']) > 0:
                file_id = data['data'][0]['attributes']['files'][0]['file_id']
                print(f"   First file_id: {file_id}")
        else:
            print(f"   ❌ Error: {response.text[:200]}")
    except Exception as e:
        print(f"   ❌ Exception: {e}")
    
    # Test 2: Try download WITHOUT login
    print("\n2️⃣  Testing DOWNLOAD without login (POST /download)")
    try:
        response = await client.post(
            f"{BASE_URL}/download",
            json={"file_id": 5250975}  # A Most Violent Year EN
        )
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Got download link!")
            print(f"   Link: {data.get('link', 'N/A')[:80]}...")
        else:
            print(f"   Response: {response.text[:300]}")
    except Exception as e:
        print(f"   ❌ Exception: {e}")
    
    # Test 3: Try to login
    print("\n3️⃣  Testing LOGIN (POST /login)")
    print("   ⚠️  No credentials configured - skipping")
    
    await client.aclose()
    print("\n" + "="*80)
    print("✅ TEST COMPLETE")
    print("="*80)

asyncio.run(test_api())
