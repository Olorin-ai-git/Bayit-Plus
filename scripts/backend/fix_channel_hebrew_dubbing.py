"""
Fix Channel dubbing languages to include Hebrew
"""

import asyncio

from app.core.config import settings
from app.models.content import LiveChannel
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient


async def main():
    print("[Setup] Connecting to MongoDB...")

    client = AsyncIOMotorClient(settings.MONGODB_URL)
    database = client[settings.MONGODB_DB_NAME]

    await init_beanie(database=database, document_models=[LiveChannel])

    # Get all channels that support dubbing
    channels = await LiveChannel.find({"supports_live_dubbing": True}).to_list()

    print(f"\n[Info] Found {len(channels)} channels with dubbing enabled\n")

    for channel in channels:
        print(f"Channel: {channel.name}")
        print(f"  ID: {channel.id}")
        print(f"  Current languages: {channel.available_dubbing_languages}")

        # Check if Hebrew is missing
        if channel.available_dubbing_languages:
            if "he" not in channel.available_dubbing_languages:
                print("  ❌ Hebrew is MISSING - adding it now...")
                # Add Hebrew to the list
                channel.available_dubbing_languages.insert(1, "he")  # After "en"
                await channel.save()
                print(f"  ✅ Updated to: {channel.available_dubbing_languages}")
            else:
                print("  ✅ Hebrew is already present")
        else:
            print("  ℹ️  No custom languages set (will use default)")

        print()

    print("[Done] All channels checked and updated")


if __name__ == "__main__":
    asyncio.run(main())
