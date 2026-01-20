#!/usr/bin/env python3
"""
Migration Script: Update Live Channel Translation Languages
Expands available_translation_languages from 6 to 10 languages for all channels.

New languages added:
- German (de)
- Italian (it)
- Portuguese (pt)
- Yiddish (yi)

All languages are supported by OpenAI Whisper for speech-to-text.
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.core.config import settings
from motor.motor_asyncio import AsyncIOMotorClient

# Full list of 10 supported languages
ALL_LANGUAGES = ["en", "es", "ar", "ru", "fr", "de", "it", "pt", "yi", "he"]


async def migrate_channels():
    """Update all live channels to support 10 translation languages."""
    print("🚀 Starting live channel language migration...")
    print(f"📊 Target languages: {', '.join(ALL_LANGUAGES)}")

    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    channels_collection = db["live_channels"]

    try:
        # Get all channels
        all_channels = await channels_collection.find({}).to_list(length=None)
        total_channels = len(all_channels)

        print(f"\n📺 Found {total_channels} live channels")

        if total_channels == 0:
            print("⚠️  No channels found. Nothing to migrate.")
            return

        # Update each channel
        updated_count = 0
        skipped_count = 0

        for channel in all_channels:
            channel_id = channel["_id"]
            channel_name = channel.get("name", "Unknown")
            current_langs = channel.get("available_translation_languages", [])

            # Check if already has all 10 languages
            if set(current_langs) == set(ALL_LANGUAGES):
                print(f"  ✓ {channel_name}: Already has all 10 languages, skipping")
                skipped_count += 1
                continue

            # Update to full language set
            result = await channels_collection.update_one(
                {"_id": channel_id},
                {"$set": {"available_translation_languages": ALL_LANGUAGES}},
            )

            if result.modified_count > 0:
                old_count = len(current_langs)
                print(f"  ✅ {channel_name}: Updated from {old_count} to 10 languages")
                updated_count += 1
            else:
                print(f"  ⚠️  {channel_name}: Update failed")

        # Summary
        print(f"\n{'='*60}")
        print(f"✅ Migration Complete!")
        print(f"{'='*60}")
        print(f"📊 Total channels: {total_channels}")
        print(f"✅ Updated: {updated_count}")
        print(f"⏭️  Skipped (already up-to-date): {skipped_count}")
        print(f"\n🌍 All channels now support these 10 languages:")
        for lang in ALL_LANGUAGES:
            lang_names = {
                "he": "Hebrew (עברית)",
                "en": "English",
                "ar": "Arabic (العربية)",
                "es": "Spanish (Español)",
                "ru": "Russian (Русский)",
                "fr": "French (Français)",
                "de": "German (Deutsch)",
                "it": "Italian (Italiano)",
                "pt": "Portuguese (Português)",
                "yi": "Yiddish (ייִדיש)",
            }
            print(f"   • {lang}: {lang_names.get(lang, lang)}")

    except Exception as e:
        print(f"\n❌ Migration failed: {str(e)}")
        raise
    finally:
        client.close()


async def verify_migration():
    """Verify that all channels have been updated correctly."""
    print("\n🔍 Verifying migration...")

    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    channels_collection = db["live_channels"]

    try:
        # Count channels with all 10 languages
        channels_with_10_langs = await channels_collection.count_documents(
            {"available_translation_languages": {"$all": ALL_LANGUAGES}}
        )

        # Count channels with fewer languages
        channels_with_fewer = await channels_collection.count_documents(
            {"available_translation_languages": {"$not": {"$all": ALL_LANGUAGES}}}
        )

        total = await channels_collection.count_documents({})

        print(f"✅ Channels with all 10 languages: {channels_with_10_langs}/{total}")

        if channels_with_fewer > 0:
            print(f"⚠️  Channels with fewer languages: {channels_with_fewer}")
            print("   Run migration again to update remaining channels.")
        else:
            print("🎉 All channels successfully migrated!")

    finally:
        client.close()


async def main():
    """Main migration entry point."""
    print("=" * 60)
    print("Live Channel Language Migration")
    print("Expanding from 6 to 10 supported languages")
    print("=" * 60)

    # Run migration
    await migrate_channels()

    # Verify results
    await verify_migration()

    print("\n✅ Migration script completed successfully!")


if __name__ == "__main__":
    asyncio.run(main())
