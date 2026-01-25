"""
Test Google Cloud TTS with Hebrew text
"""
import asyncio
from app.services.google_tts_service import GoogleTTSService

async def test_google_tts():
    """Test Google TTS with Hebrew"""

    print("=" * 80)
    print("TESTING GOOGLE CLOUD TTS - HEBREW")
    print("=" * 80)
    print()

    # Sample Hebrew text
    hebrew_text = "שלום, זהו מבחן של שירות התרגום לעברית של גוגל. האם זה נשמע כמו עברית אמיתית?"

    print(f"Hebrew text: {hebrew_text}")
    print(f"Translation: Hello, this is a test of Google's Hebrew translation service. Does this sound like real Hebrew?")
    print()

    # Create Google TTS service
    tts_service = GoogleTTSService()

    # Generate audio
    print("Generating audio with Google TTS (Hebrew male voice - Wavenet-B)...")

    audio_bytes = await tts_service.generate_audio(
        text=hebrew_text,
        language_code="he-IL",
        voice_name="he-IL-Wavenet-B",  # Male Wavenet voice
        output_path="/tmp/test_hebrew_google.mp3"
    )

    print(f"✅ Generated {len(audio_bytes)} bytes")
    print(f"✅ Saved to: /tmp/test_hebrew_google.mp3")
    print()

    print("=" * 80)
    print("TEST COMPLETE")
    print("=" * 80)
    print()
    print("Now we need to verify this audio actually sounds like Hebrew!")
    print("Let's transcribe it back with Whisper to detect the language...")
    print()

    # Transcribe with Whisper to verify language
    from openai import AsyncOpenAI
    from app.core.config import settings

    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    with open("/tmp/test_hebrew_google.mp3", "rb") as audio_file:
        transcription = await client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            response_format="verbose_json"
        )

    detected_lang = transcription.language
    transcript = transcription.text

    print("VERIFICATION RESULTS:")
    print("=" * 80)
    print(f"Whisper detected language: {detected_lang}")
    print(f"Transcribed text: {transcript}")
    print()

    if detected_lang == "hebrew":
        print("✅ SUCCESS! Google TTS produced proper Hebrew!")
    else:
        print(f"❌ FAILED! Detected language: {detected_lang} (expected: hebrew)")

    print("=" * 80)

if __name__ == "__main__":
    asyncio.run(test_google_tts())
