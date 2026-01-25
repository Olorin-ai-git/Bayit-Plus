"""
Check the Hebrew to English translation results
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.content import PodcastEpisode
from app.core.config import settings

async def check_translation():
    """Check the translation results"""
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    await init_beanie(database=db, document_models=[PodcastEpisode])

    episode = await PodcastEpisode.get("69729fac9d27d77a468d90b0")

    print("=" * 80)
    print("HEBREW TO ENGLISH TRANSLATION RESULTS")
    print("=" * 80)
    print(f"Episode: {episode.title}")
    print()

    # Check English translation
    if hasattr(episode, 'translations') and episode.translations:
        if "en" in episode.translations:
            en_trans = episode.translations["en"]
            print("✅ English translation exists!")
            print(f"Audio URL: {en_trans.audio_url}")
            print(f"Voice ID: {en_trans.voice_id}")
            print(f"Language: {en_trans.language}")
            print()

            if hasattr(en_trans, 'transcript'):
                print(f"Original Hebrew transcript length: {len(en_trans.transcript)} chars")
                print("First 500 chars of Hebrew:")
                print(en_trans.transcript[:500])
                print()

            if hasattr(en_trans, 'translated_text'):
                print(f"English translation length: {len(en_trans.translated_text)} chars")
                print("First 500 chars of English:")
                print(en_trans.translated_text[:500])
                print()
        else:
            print("❌ No English translation found in translations dict")
    else:
        print("❌ No translations found")

    # Check translation stages
    if hasattr(episode, 'translation_stages') and episode.translation_stages:
        print("=" * 80)
        print("TRANSLATION STAGES")
        print("=" * 80)

        if 'transcribed' in episode.translation_stages:
            stage = episode.translation_stages['transcribed']
            print("\n📝 TRANSCRIPTION STAGE:")
            print(f"   Language detected: {stage.get('language', 'N/A')}")
            transcript = stage.get('transcript', '')
            print(f"   Transcript length: {len(transcript)} chars")
            print(f"   First 300 chars: {transcript[:300]}")

        if 'commercials_removed' in episode.translation_stages:
            stage = episode.translation_stages['commercials_removed']
            print("\n🚫 COMMERCIAL REMOVAL STAGE:")
            print(f"   Original length: {stage.get('original_length', 0)} chars")
            print(f"   Cleaned length: {stage.get('cleaned_length', 0)} chars")
            print(f"   Commercials removed: {len(stage.get('removed_commercials', []))}")

        if 'translated' in episode.translation_stages:
            stage = episode.translation_stages['translated']
            print("\n🌐 TRANSLATION STAGE:")
            translated = stage.get('translated_text', '')
            print(f"   Translation length: {len(translated)} chars")
            print(f"   First 300 chars: {translated[:300]}")

        if 'tts_generated' in episode.translation_stages:
            stage = episode.translation_stages['tts_generated']
            print("\n🔊 TTS GENERATION STAGE:")
            print(f"   Audio path: {stage.get('audio_path', 'N/A')}")
            print(f"   File size: {stage.get('file_size', 0)} bytes")

    print()
    print("=" * 80)

    client.close()

if __name__ == "__main__":
    asyncio.run(check_translation())
