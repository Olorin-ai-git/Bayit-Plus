"""
Simple ElevenLabs API Test

Tests the ElevenLabs conversational AI video endpoint directly
to verify if avatar creation is supported.
"""

import asyncio
import httpx
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.core.config import settings


async def test_elevenlabs_api():
    """Test ElevenLabs API to check if conversational AI video endpoint exists"""

    print("=" * 60)
    print("ElevenLabs API Endpoint Test")
    print("=" * 60)

    api_key = settings.ELEVENLABS_API_KEY
    voice_id = settings.CHARACTER_VOICE_DEFAULT

    print(f"\n1. Configuration:")
    print(f"   - API Key: {api_key[:20]}...")
    print(f"   - Voice ID: {voice_id}")
    print(f"   - Base URL: https://api.elevenlabs.io/v1")

    # Test 1: Get available voices
    print(f"\n2. Testing: Get available voices...")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.elevenlabs.io/v1/voices",
                headers={"xi-api-key": api_key}
            )
            response.raise_for_status()
            voices = response.json()
            print(f"   ✓ Success! Found {len(voices.get('voices', []))} voices")

            # Check if our voice ID exists
            voice_names = [v['name'] for v in voices.get('voices', []) if v['voice_id'] == voice_id]
            if voice_names:
                print(f"   ✓ Voice ID {voice_id} found: {voice_names[0]}")
            else:
                print(f"   ⚠ Voice ID {voice_id} not found in available voices")
    except Exception as e:
        print(f"   ✗ Failed: {str(e)}")
        return False

    # Test 2: Generate simple TTS audio
    print(f"\n3. Testing: Generate TTS audio...")
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
                headers={
                    "xi-api-key": api_key,
                    "Content-Type": "application/json"
                },
                json={
                    "text": "Hello, this is a test.",
                    "model_id": "eleven_multilingual_v2"
                }
            )
            response.raise_for_status()
            audio_bytes = response.content
            print(f"   ✓ Success! Generated {len(audio_bytes)} bytes of audio")
    except Exception as e:
        print(f"   ✗ Failed: {str(e)}")
        return False

    # Test 3: Check for conversational AI video endpoint
    print(f"\n4. Testing: Conversational AI video endpoint...")
    print(f"   Note: This is likely to fail as it may not be a real endpoint")

    # First, let's check the API documentation endpoint
    try:
        async with httpx.AsyncClient() as client:
            # Try to get API info
            response = await client.get(
                "https://api.elevenlabs.io/v1",
                headers={"xi-api-key": api_key}
            )
            print(f"   Response status: {response.status_code}")
            print(f"   Response: {response.text[:200]}")
    except Exception as e:
        print(f"   ✗ API info request failed: {str(e)}")

    # Now test the video endpoint (this will likely fail)
    print(f"\n5. Checking conversational-ai/video endpoint availability...")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.elevenlabs.io/v1/conversational-ai/video",
                headers={
                    "xi-api-key": api_key,
                    "Content-Type": "application/json"
                },
                json={
                    "image_url": "https://example.com/test.jpg",
                    "audio_url": "https://example.com/test.mp3",
                    "model": "eleven_video_v1"
                }
            )
            print(f"   Response status: {response.status_code}")
            print(f"   Response: {response.text}")
            response.raise_for_status()
            print(f"   ✓ Endpoint exists!")
    except httpx.HTTPStatusError as e:
        print(f"   ✗ HTTP Error {e.response.status_code}: {e.response.text}")
        print(f"\n   This endpoint likely doesn't exist in the ElevenLabs API.")
        print(f"   We need to check the actual ElevenLabs API documentation for video/avatar features.")
    except Exception as e:
        print(f"   ✗ Failed: {str(e)}")

    print(f"\n" + "=" * 60)
    print("Test Summary:")
    print("- TTS API: ✓ Working")
    print("- Conversational AI Video: ? Unknown (likely not available)")
    print("=" * 60)
    print(f"\nNext steps:")
    print("1. Check ElevenLabs documentation for actual video/avatar API")
    print("2. May need to use a different provider (Creatify, D-ID, HeyGen)")
    print("3. Or implement avatar using TTS + static image overlay")

    return True


if __name__ == "__main__":
    asyncio.run(test_elevenlabs_api())
