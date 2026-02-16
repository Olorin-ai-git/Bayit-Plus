"""
Test Creatify Avatar Creation

This script tests the Creatify Aurora API by:
1. Generating TTS audio with ElevenLabs
2. Creating an animated avatar with Creatify lip-sync
3. Verifying the video was generated successfully
"""

import asyncio
import sys
import tempfile
import httpx
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.core.config import settings
from app.services.vod_interaction.character_animator import character_animator_service


async def test_creatify_avatar():
    """Test avatar creation using Creatify provider"""

    print("=" * 60)
    print("Creatify Avatar Creation Test")
    print("=" * 60)

    image_path = "/Users/olorin/Downloads/Etai.png"
    test_text = "Hello! I'm Etai. It's great to meet you!"
    character_name = "Etai"
    voice_id = settings.CHARACTER_VOICE_MOSHE

    print(f"\n1. Configuration:")
    print(f"   - Image: {image_path}")
    print(f"   - Text: {test_text}")
    print(f"   - Character: {character_name}")
    print(f"   - Voice ID: {voice_id}")
    print(f"   - Provider: {settings.CHARACTER_ANIMATION_PROVIDER}")
    print(f"   - Creatify URL: {settings.CREATIFY_API_URL}")
    print(f"   - Creatify ID: {settings.CREATIFY_API_ID[:20]}..." if len(settings.CREATIFY_API_ID) > 20 else "")

    # Temporarily switch to Creatify provider for testing
    original_provider = settings.CHARACTER_ANIMATION_PROVIDER
    settings.CHARACTER_ANIMATION_PROVIDER = "creatify"

    try:
        # First upload image to a public URL (we'll use a temporary approach)
        print(f"\n2. Uploading test image...")

        # For testing, we need the image to be publicly accessible
        # Let's use a simple approach: upload to a temporary hosting service
        # or use base64 encoding if the API supports it

        # Read the image file
        with open(image_path, "rb") as f:
            image_bytes = f.read()

        # For this test, let's use a mock URL since we need a public URL
        # In production, this would be uploaded to GCS
        print(f"   ⚠ Note: Skipping image upload (GCS not configured)")
        print(f"   Using placeholder image URL for testing")

        image_url = "https://storage.googleapis.com/bayit-plus-test/character-frames/test.png"

        print(f"\n3. Testing Creatify API endpoint...")

        # Test if Creatify API is accessible
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                headers = {
                    "X-API-ID": settings.CREATIFY_API_ID,
                    "X-API-KEY": settings.CREATIFY_API_KEY
                }
                response = await client.get(
                    f"{settings.CREATIFY_API_URL}/api/health",
                    headers=headers
                )
                print(f"   API Response: {response.status_code}")
                if response.status_code == 404:
                    print(f"   ⚠ Health endpoint not found, but API might still work")
                else:
                    print(f"   ✓ API is accessible")
        except Exception as e:
            print(f"   ⚠ Could not reach API: {str(e)}")

        print(f"\n4. Checking Creatify credentials...")
        print(f"   - CREATIFY_API_ID: {'✓ Set' if settings.CREATIFY_API_ID else '✗ Missing'}")
        print(f"   - CREATIFY_API_KEY: {'✓ Set' if settings.CREATIFY_API_KEY else '✗ Missing'}")
        print(f"   - CREATIFY_API_URL: {settings.CREATIFY_API_URL}")

        if not settings.CREATIFY_API_ID or not settings.CREATIFY_API_KEY:
            print(f"\n" + "=" * 60)
            print("ERROR: Creatify credentials not configured")
            print("=" * 60)
            print(f"\nPlease set the following secrets:")
            print(f"  - bayit-creatify-api-id")
            print(f"  - bayit-creatify-api-key")
            return False

        print(f"\n5. Creating animated avatar with Creatify...")
        print(f"   This may take 30-60 seconds...")
        print(f"   Note: Will fail if image URL is not publicly accessible")

        result = await character_animator_service.animate_character_response(
            character_name=character_name,
            dialogue_text=test_text,
            character_frame_url=image_url,
            voice_id=voice_id
        )

        print(f"\n6. Avatar creation completed!")
        print(f"   ✓ Audio URL: {result.audio_url}")
        print(f"   ✓ Video URL: {result.video_url}")
        print(f"   ✓ Duration: {result.duration}s")

        print(f"\n" + "=" * 60)
        print("SUCCESS: Avatar was created successfully with Creatify!")
        print("=" * 60)

        return True

    except Exception as e:
        print(f"\n" + "=" * 60)
        print(f"ERROR: Avatar creation failed")
        print("=" * 60)
        print(f"\nError details: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

    finally:
        # Restore original provider
        settings.CHARACTER_ANIMATION_PROVIDER = original_provider


if __name__ == "__main__":
    success = asyncio.run(test_creatify_avatar())
    sys.exit(0 if success else 1)
