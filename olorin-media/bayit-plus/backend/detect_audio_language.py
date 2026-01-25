"""
Download the generated Hebrew audio and detect what language it actually is
using Google Translate API and Whisper transcription
"""
import asyncio
import httpx
from pathlib import Path
from google.cloud import translate_v2 as translate
from openai import AsyncOpenAI
from app.core.config import settings

async def detect_language():
    """Download audio and detect language"""

    # URL of the supposedly Hebrew audio
    audio_url = "https://cdn.bayit.tv/podcasts/translations/697439f1e0501bc53693246c/he_20260125_030651.mp3"

    print("=" * 80)
    print("LANGUAGE DETECTION ANALYSIS")
    print("=" * 80)
    print(f"Audio URL: {audio_url}")
    print()

    # Download the audio file
    print("Step 1: Downloading audio file...")
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.get(audio_url)
        response.raise_for_status()

        audio_path = Path("/tmp/mystery_language.mp3")
        audio_path.write_bytes(response.content)
        print(f"✅ Downloaded: {len(response.content)} bytes")
        print()

    # Step 2: Transcribe with Whisper (language auto-detection)
    print("Step 2: Transcribing with OpenAI Whisper (auto language detection)...")
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    with open(audio_path, "rb") as audio_file:
        transcription = await client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            response_format="verbose_json"
        )

    detected_language = transcription.language
    transcript_text = transcription.text

    print(f"✅ Whisper detected language: {detected_language}")
    print(f"✅ Transcribed text ({len(transcript_text)} characters):")
    print(transcript_text[:500])
    print()

    # Step 3: Use Google Translate to detect language from transcribed text
    print("Step 3: Using Google Translate to detect language...")
    translate_client = translate.Client()

    detection = translate_client.detect_language(transcript_text[:1000])  # First 1000 chars

    print(f"✅ Google Translate detected language: {detection['language']}")
    print(f"   Confidence: {detection['confidence']}")
    print()

    # Step 4: Try translating a sample to English to see what it says
    print("Step 4: Translating sample to English to verify content...")
    translation = translate_client.translate(
        transcript_text[:500],
        target_language="en",
        source_language=detection['language']
    )

    print(f"✅ Translation to English:")
    print(translation['translatedText'])
    print()

    # Step 5: Summary
    print("=" * 80)
    print("ANALYSIS SUMMARY")
    print("=" * 80)
    print(f"Whisper detected: {detected_language}")
    print(f"Google Translate detected: {detection['language']} (confidence: {detection['confidence']})")
    print()
    print("Expected: Hebrew (he)")
    print(f"Actual: {detection['language']}")
    print()

    if detection['language'] != 'he':
        print("❌ LANGUAGE MISMATCH!")
        print(f"   The audio is in {detection['language']}, NOT Hebrew!")
    else:
        print("✅ Language is correct (Hebrew)")

    print("=" * 80)

if __name__ == "__main__":
    asyncio.run(detect_language())
