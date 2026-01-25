"""
List all available ElevenLabs voices and check which ones support Hebrew
"""
import asyncio
import httpx
from app.core.config import settings

async def list_voices():
    """Query ElevenLabs API for all available voices"""

    print("=" * 80)
    print("ELEVENLABS VOICES ANALYSIS")
    print("=" * 80)
    print()

    url = "https://api.elevenlabs.io/v1/voices"
    headers = {"xi-api-key": settings.ELEVENLABS_API_KEY}

    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)
        response.raise_for_status()

        data = response.json()
        voices = data.get("voices", [])

        print(f"Total voices available: {len(voices)}")
        print()

        # Filter for voices that support Hebrew
        print("=" * 80)
        print("VOICES WITH HEBREW SUPPORT")
        print("=" * 80)

        hebrew_voices = []

        for voice in voices:
            voice_id = voice.get("voice_id")
            name = voice.get("name")
            labels = voice.get("labels", {})
            gender = labels.get("gender", "unknown")
            age = labels.get("age", "unknown")
            accent = labels.get("accent", "unknown")
            description = labels.get("description", "")
            use_case = labels.get("use_case", "")

            # Check if voice supports Hebrew
            # ElevenLabs multilingual voices support many languages including Hebrew
            category = voice.get("category", "unknown")

            # Get supported languages if available
            supported_languages = voice.get("supported_languages", [])

            if supported_languages:
                # Check if Hebrew is explicitly listed
                if "he" in supported_languages or "heb" in supported_languages or "hebrew" in [lang.lower() for lang in supported_languages]:
                    hebrew_voices.append({
                        "voice_id": voice_id,
                        "name": name,
                        "gender": gender,
                        "age": age,
                        "accent": accent,
                        "category": category,
                        "description": description,
                        "languages": supported_languages
                    })

        if hebrew_voices:
            print(f"\nFound {len(hebrew_voices)} voices with explicit Hebrew support:\n")
            for v in hebrew_voices:
                print(f"Name: {v['name']}")
                print(f"  ID: {v['voice_id']}")
                print(f"  Gender: {v['gender']}, Age: {v['age']}")
                print(f"  Category: {v['category']}")
                print(f"  Languages: {', '.join(v['languages'][:10])}")  # First 10 languages
                print(f"  Description: {v['description']}")
                print()
        else:
            print("\n❌ No voices found with explicit Hebrew support!")
            print("\nLet's check multilingual voices instead...")
            print()

            # Check for multilingual voices (these should support Hebrew)
            multilingual = [v for v in voices if "multilingual" in v.get("category", "").lower() or
                           "multilingual" in v.get("name", "").lower()]

            if multilingual:
                print(f"Found {len(multilingual)} multilingual voices:\n")
                for v in multilingual[:10]:  # Show first 10
                    print(f"Name: {v.get('name')}")
                    print(f"  ID: {v.get('voice_id')}")
                    print(f"  Labels: {v.get('labels', {})}")
                    print()

    print("=" * 80)

if __name__ == "__main__":
    asyncio.run(list_voices())
