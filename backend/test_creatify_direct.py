"""
Direct Creatify API Test

Tests the Creatify API directly with the correct API structure:
1. Upload files to get public URLs (using file.io or similar)
2. Create a creator/persona with the image
3. Create lipsync with the audio
"""

import asyncio
import httpx
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.core.config import settings


async def upload_to_fileio(file_path: str) -> str:
    """Upload file to file.io for temporary public URL"""
    print(f"   Uploading {Path(file_path).name} to file.io...")

    async with httpx.AsyncClient(timeout=60.0) as client:
        with open(file_path, "rb") as f:
            files = {"file": f}
            response = await client.post(
                "https://file.io",
                files=files,
                data={"expires": "1d"}
            )
            response.raise_for_status()
            result = response.json()

            if not result.get("success"):
                raise Exception(f"Upload failed: {result}")

            url = result["link"]
            print(f"   ✓ Uploaded: {url}")
            return url


async def test_creatify_api():
    """Test Creatify API with proper workflow"""

    print("=" * 60)
    print("Creatify API Direct Test")
    print("=" * 60)

    image_path = "/Users/olorin/Downloads/Etai.png"
    audio_path = "/Users/olorin/Downloads/IMG_0629.mp3"

    api_url = settings.CREATIFY_API_URL
    api_id = settings.CREATIFY_API_ID
    api_key = settings.CREATIFY_API_KEY

    headers = {
        "X-API-ID": api_id,
        "X-API-KEY": api_key,
        "Content-Type": "application/json"
    }

    print(f"\n1. Configuration:")
    print(f"   - Image: {image_path}")
    print(f"   - Audio: {audio_path}")
    print(f"   - API URL: {api_url}")
    print(f"   - API ID: {api_id[:20]}...")

    try:
        # Step 1: Upload files to get public URLs
        print(f"\n2. Uploading files to get public URLs...")

        image_url = await upload_to_fileio(image_path)
        audio_url = await upload_to_fileio(audio_path)

        print(f"\n   Image URL: {image_url}")
        print(f"   Audio URL: {audio_url}")

        # Step 2: Check if we need to create a creator or can use image_url directly
        # Let's first try to get personas to understand the structure
        print(f"\n3. Checking Creatify API structure...")

        async with httpx.AsyncClient(timeout=30.0) as client:
            # Try to get personas/creators
            try:
                response = await client.get(
                    f"{api_url}/api/personas",
                    headers=headers
                )
                print(f"   GET /api/personas: {response.status_code}")
                if response.status_code == 200:
                    personas = response.json()
                    print(f"   Found {len(personas.get('results', []))} personas")
            except Exception as e:
                print(f"   /api/personas: {str(e)}")

            # Step 3: Try to create lipsync with direct image_url approach
            print(f"\n4. Attempting lipsync creation (Method 1: image_url)...")

            try:
                payload = {
                    "image_url": image_url,
                    "audio_url": audio_url,
                    "aspect_ratio": "1:1",
                    "model_version": "aurora_v1"
                }

                print(f"   Payload: {payload}")

                response = await client.post(
                    f"{api_url}/api/lipsyncs/",
                    json=payload,
                    headers=headers
                )

                print(f"   Response: {response.status_code}")
                print(f"   Body: {response.text}")

                if response.status_code in [200, 201]:
                    result = response.json()
                    lipsync_id = result.get("id")
                    print(f"\n   ✓ Lipsync created: {lipsync_id}")
                    print(f"   Status: {result.get('status')}")

                    # Poll for completion
                    print(f"\n5. Polling for completion...")
                    video_url = await poll_lipsync(client, api_url, headers, lipsync_id)

                    print(f"\n" + "=" * 60)
                    print("SUCCESS: Avatar created!")
                    print("=" * 60)
                    print(f"\nVideo URL: {video_url}")

                    return True

                else:
                    response.raise_for_status()

            except httpx.HTTPStatusError as e:
                print(f"   ✗ Method 1 failed: {e.response.status_code}")
                print(f"   Response: {e.response.text}")

                # Try Method 2: with text instead
                print(f"\n5. Attempting lipsync creation (Method 2: text)...")

                payload2 = {
                    "image_url": image_url,
                    "text": "Hello! I'm Etai. It's great to meet you!",
                    "aspect_ratio": "1:1",
                    "model_version": "aurora_v1"
                }

                response2 = await client.post(
                    f"{api_url}/api/lipsyncs/",
                    json=payload2,
                    headers=headers
                )

                print(f"   Response: {response2.status_code}")
                print(f"   Body: {response2.text}")

                if response2.status_code not in [200, 201]:
                    print(f"\n   Both methods failed. The API might require:")
                    print(f"   1. Creating a creator/persona first")
                    print(f"   2. Different parameter names")
                    print(f"   3. Specific model versions")
                    return False
                else:
                    result = response2.json()
                    print(f"\n   ✓ Lipsync created with text!")
                    return True

    except Exception as e:
        print(f"\n" + "=" * 60)
        print(f"ERROR: Test failed")
        print("=" * 60)
        print(f"\nError: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def poll_lipsync(client, api_url, headers, lipsync_id, max_attempts=60):
    """Poll for lipsync completion"""
    import time

    for attempt in range(max_attempts):
        await asyncio.sleep(5)

        response = await client.get(
            f"{api_url}/api/lipsyncs/{lipsync_id}",
            headers=headers
        )

        result = response.json()
        status = result.get("status")

        print(f"   [{attempt + 1}/{max_attempts}] Status: {status}")

        if status == "completed":
            return result.get("video_url")
        elif status == "failed":
            raise Exception(f"Lipsync failed: {result.get('error')}")

    raise TimeoutError("Lipsync timed out")


if __name__ == "__main__":
    success = asyncio.run(test_creatify_api())
    sys.exit(0 if success else 1)
