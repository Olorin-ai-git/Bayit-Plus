import httpx
import asyncio

API_KEY = "cZR4Z0ac8JgPKZ4GUFHxi3icguKcpCO0"
BASE_URL = "https://api.opensubtitles.com/api/v1"

async def test_full_flow():
    client = httpx.AsyncClient(
        timeout=30.0,
        headers={
            "Api-Key": API_KEY,
            "User-Agent": "Bayit+ v1.0",
            "Content-Type": "application/json"
        }
    )
    
    print("🧪 FULL E2E TEST: Search → Download → Parse\n")
    
    # Search
    print("1️⃣  Searching for '300' subtitles...")
    search_response = await client.get(
        f"{BASE_URL}/subtitles",
        params={"imdb_id": "416449", "languages": "en"}
    )
    
    if search_response.status_code != 200:
        print(f"❌ Search failed: {search_response.status_code}")
        return
    
    data = search_response.json()
    file_id = data['data'][0]['attributes']['files'][0]['file_id']
    print(f"   ✅ Found file_id: {file_id}")
    
    # Get download link
    print(f"\n2️⃣  Getting download link...")
    download_response = await client.post(
        f"{BASE_URL}/download",
        json={"file_id": file_id}
    )
    
    if download_response.status_code != 200:
        print(f"❌ Download request failed: {download_response.status_code}")
        print(f"   Response: {download_response.text[:500]}")
        return
    
    download_data = download_response.json()
    download_url = download_data.get('link')
    print(f"   ✅ Got link: {download_url[:80]}...")
    
    # Download actual subtitle file
    print(f"\n3️⃣  Downloading subtitle file...")
    file_response = await client.get(download_url)
    
    if file_response.status_code != 200:
        print(f"❌ File download failed: {file_response.status_code}")
        return
    
    subtitle_text = file_response.text
    lines = subtitle_text.split('\n')
    
    print(f"   ✅ Downloaded {len(subtitle_text)} bytes")
    print(f"   Lines: {len(lines)}")
    print(f"\n   First 10 lines:")
    for line in lines[:10]:
        print(f"     {line}")
    
    print(f"\n✅ SUCCESS! OpenSubtitles API works perfectly!")
    
    await client.aclose()

asyncio.run(test_full_flow())
