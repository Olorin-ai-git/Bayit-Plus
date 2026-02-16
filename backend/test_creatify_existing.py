"""
Test Creatify with Existing Avatar

Uses an existing avatar/creator from the Creatify account
to create a lipsync with the provided audio file.
"""

import asyncio
import httpx
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.core.config import settings


async def test_existing_avatar():
    """Test with existing Creatify avatar"""

    print("=" * 60)
    print("Creatify - Using Existing Avatar")
    print("=" * 60)

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
    print(f"   - Audio: {audio_path}")
    print(f"   - API URL: {api_url}")
    print(f"   - API ID: {api_id[:20]}...")

    try:
        async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:

            # Step 1: List existing personas/avatars
            print(f"\n2. Fetching your existing avatars...")

            response = await client.get(
                f"{api_url}/api/personas",
                headers=headers
            )

            print(f"   API Response: {response.status_code}")

            if response.status_code == 200:
                personas_data = response.json()
                # Handle both list and object responses
                if isinstance(personas_data, list):
                    personas = personas_data
                else:
                    personas = personas_data.get("results", [])

                if not personas:
                    print(f"\n   No avatars found in your account.")
                    print(f"   Please create one at https://app.creatify.ai")
                    return False

                print(f"\n   Found {len(personas)} avatar(s):")
                for i, persona in enumerate(personas):
                    print(f"\n   [{i+1}] ID: {persona.get('id')}")
                    print(f"       Name: {persona.get('name', 'Unnamed')}")
                    print(f"       Image: {persona.get('image_url', 'N/A')[:60]}...")
                    if persona.get('description'):
                        print(f"       Description: {persona.get('description')}")

                # Use the first avatar
                selected_avatar = personas[0]
                avatar_id = selected_avatar.get('id')

                print(f"\n3. Using avatar: {selected_avatar.get('name', avatar_id)}")

            else:
                print(f"   Error: {response.text}")
                return False

            # Step 2: Upload audio file or use text
            print(f"\n4. Creating lipsync with text (audio upload alternative)...")

            # Try with text first (simpler)
            payload = {
                "creator": avatar_id,
                "text": "Hello! This is a test of the Creatify avatar system.",
                "aspect_ratio": "1x1",
                "model_version": "aurora_v1"
            }

            print(f"   Payload:")
            print(f"   - creator: {avatar_id}")
            print(f"   - text: {payload['text']}")
            print(f"   - aspect_ratio: {payload['aspect_ratio']}")
            print(f"   - model_version: {payload['model_version']}")

            response = await client.post(
                f"{api_url}/api/lipsyncs/",
                json=payload,
                headers=headers
            )

            print(f"\n   API Response: {response.status_code}")
            print(f"   Response Body: {response.text[:500]}")

            if response.status_code in [200, 201]:
                result = response.json()
                lipsync_id = result.get("id")
                status = result.get("status")

                print(f"\n   ✓ Lipsync created successfully!")
                print(f"   - ID: {lipsync_id}")
                print(f"   - Status: {status}")

                # Step 3: Poll for completion
                print(f"\n5. Polling for completion (this may take 30-60 seconds)...")

                for attempt in range(60):
                    await asyncio.sleep(5)

                    poll_response = await client.get(
                        f"{api_url}/api/lipsyncs/{lipsync_id}",
                        headers=headers
                    )

                    if poll_response.status_code == 200:
                        poll_result = poll_response.json()
                        current_status = poll_result.get("status")

                        print(f"   [{attempt + 1}/60] Status: {current_status}")

                        if current_status == "completed":
                            video_url = poll_result.get("video_url")

                            print(f"\n" + "=" * 60)
                            print("SUCCESS: Avatar video created!")
                            print("=" * 60)
                            print(f"\nVideo URL: {video_url}")
                            print(f"\nYou can download and view the video at the URL above.")

                            return True

                        elif current_status == "failed":
                            error = poll_result.get("error", "Unknown error")
                            print(f"\n   ✗ Generation failed: {error}")
                            return False
                    else:
                        print(f"   Polling error: {poll_response.status_code}")

                print(f"\n   ⚠ Timed out waiting for completion")
                return False

            else:
                print(f"\n   ✗ Failed to create lipsync")
                print(f"   Error: {response.text}")

                # Try alternative payload structure
                print(f"\n   Trying alternative API structure...")

                alt_payload = {
                    "persona_id": avatar_id,
                    "script": "Hello! This is a test of the Creatify avatar system.",
                    "aspect_ratio": "1:1"
                }

                alt_response = await client.post(
                    f"{api_url}/api/lipsyncs/",
                    json=alt_payload,
                    headers=headers
                )

                print(f"   Alternative attempt: {alt_response.status_code}")
                print(f"   Response: {alt_response.text[:500]}")

                return False

    except Exception as e:
        print(f"\n" + "=" * 60)
        print(f"ERROR: Test failed")
        print("=" * 60)
        print(f"\nError: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = asyncio.run(test_existing_avatar())
    sys.exit(0 if success else 1)
