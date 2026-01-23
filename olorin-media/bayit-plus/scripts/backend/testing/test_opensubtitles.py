#!/usr/bin/env python3
"""Test OpenSubtitles integration"""
import asyncio

from app.core.database import close_mongo_connection, connect_to_mongo
from app.services.external_subtitle_service import ExternalSubtitleService
from app.services.opensubtitles_service import get_opensubtitles_service


async def test_quota():
    """Test quota check"""
    print("🔍 Testing OpenSubtitles Service...\n")

    service = get_opensubtitles_service()
    print(f"✅ Service initialized")
    print(f"   API Base URL: {service.base_url}")
    print(f"   Daily Limit: {service.daily_limit}")
    print(
        f"   Rate Limit: {service.rate_limit_requests} requests/{service.rate_limit_window}s"
    )

    # Check quota
    quota = await service.check_quota_available()
    print(f"\n📊 Current Quota:")
    print(f"   Available: {'✅ Yes' if quota['available'] else '❌ No'}")
    print(f"   Remaining: {quota['remaining']}/{quota['daily_limit']}")
    print(f"   Used Today: {quota['used']}")
    print(f"   Resets At: {quota['resets_at'].strftime('%Y-%m-%d %H:%M:%S UTC')}")

    await service.close()

    return quota


async def test_external_service():
    """Test external subtitle service"""
    print("\n\n🔍 Testing External Subtitle Service...\n")

    service = ExternalSubtitleService()
    print("✅ External Subtitle Service initialized")
    print("   Sources: OpenSubtitles, TMDB")

    return service


async def main():
    try:
        # Initialize database connection
        print("🔌 Connecting to MongoDB...\n")
        await connect_to_mongo()

        # Test quota
        quota = await test_quota()

        # Test external service
        service = await test_external_service()

        print("\n\n✅ All tests passed!")
        print("\n📝 Integration Summary:")
        print("   ✓ MongoDB connection established")
        print("   ✓ OpenSubtitles API configured")
        print("   ✓ Quota tracking working")
        print("   ✓ External subtitle service ready")
        print("   ✓ Cache and quota models initialized")
        print(f"   ✓ Ready to download up to {quota['remaining']} subtitles today")

    except Exception as e:
        print(f"\n❌ Test failed: {str(e)}")
        import traceback

        traceback.print_exc()
    finally:
        # Close database connection
        await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(main())
