"""
Test ElevenLabs Avatar Creation

This script tests the ElevenLabs animator by:
1. Uploading a test image to GCS
2. Creating an animated avatar with the image
3. Verifying the video was generated successfully
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.core.storage import storage_service
from app.core.elevenlabs_animator import elevenlabs_animator_client
from app.core.config import settings


async def test_avatar_creation():
    """Test avatar creation with provided image"""

    print("=" * 60)
    print("ElevenLabs Avatar Creation Test")
    print("=" * 60)

    image_path = "/Users/olorin/Downloads/Etai.png"
    test_text = "Hello, I'm Etai. It's nice to meet you!"
    voice_id = settings.CHARACTER_VOICE_MOSHE

    print(f"\n1. Configuration:")
    print(f"   - Image: {image_path}")
    print(f"   - Text: {test_text}")
    print(f"   - Voice ID: {voice_id}")
    print(f"   - Provider: {settings.CHARACTER_ANIMATION_PROVIDER}")
    print(f"   - API Key: {settings.ELEVENLABS_API_KEY[:20]}...")

    try:
        print(f"\n2. Uploading test image to GCS...")
        gcs_path = "vod-interactions/test-avatars/etai-test.png"
        image_url = await storage_service.upload_file(
            image_path,
            gcs_path
        )
        print(f"   ✓ Image uploaded: {image_url}")

        print(f"\n3. Creating animated avatar with ElevenLabs...")
        print(f"   This may take 30-60 seconds...")

        video_url = await elevenlabs_animator_client.create_lipsync(
            image_url=image_url,
            text=test_text,
            voice_id=voice_id,
            aspect_ratio="1:1"
        )

        print(f"\n4. Avatar creation completed!")
        print(f"   ✓ Video URL: {video_url}")

        print(f"\n" + "=" * 60)
        print("SUCCESS: Avatar was created successfully!")
        print("=" * 60)
        print(f"\nYou can view the video at:")
        print(f"{video_url}")

        return True

    except Exception as e:
        print(f"\n" + "=" * 60)
        print(f"ERROR: Avatar creation failed")
        print(f"=" * 60)
        print(f"\nError details: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = asyncio.run(test_avatar_creation())
    sys.exit(0 if success else 1)
