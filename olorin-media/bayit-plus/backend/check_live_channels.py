#!/usr/bin/env python3
"""Check MongoDB connection and LiveChannel count."""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.content import LiveChannel
from app.core.config import settings


async def check_connection():
    """Check MongoDB connection and LiveChannel count."""
    try:
        # Initialize MongoDB connection
        client = AsyncIOMotorClient(settings.MONGODB_URI)
        database = client[settings.MONGODB_DB_NAME]

        # Initialize Beanie with LiveChannel model
        await init_beanie(database=database, document_models=[LiveChannel])

        # Count LiveChannel documents
        count = await LiveChannel.count()
        print(f"✅ MongoDB connection successful")
        print(f"📊 LiveChannel documents: {count}")

        # If count is 0, show a sample document structure
        if count == 0:
            print("\n⚠️  No LiveChannel documents found in database")
            print("Sample LiveChannel structure:")
            print({
                "name": "Channel Name",
                "description": "Channel description",
                "logo": "https://example.com/logo.png",
                "thumbnail": "https://example.com/thumb.jpg",
                "stream_url": "https://example.com/stream.m3u8",
                "category": "general",
                "is_active": True,
                "order": 1,
                "culture_id": None,
                "current_show": "Current Show",
                "next_show": "Next Show",
            })
        else:
            # Show first channel
            first_channel = await LiveChannel.find_one()
            print(f"\nFirst channel: {first_channel.name}")
            print(f"Category: {first_channel.category}")
            print(f"Active: {first_channel.is_active}")

    except Exception as e:
        print(f"❌ Error connecting to MongoDB: {e}")
    finally:
        if 'client' in locals():
            client.close()


if __name__ == "__main__":
    asyncio.run(check_connection())
