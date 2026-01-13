"""
Test Librarian Title Cleaning Integration
Tests the auto_fixer's ability to handle messy titles
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.core.config import settings
from app.models.content import Content
from app.models.librarian import LibrarianAction
from app.services.auto_fixer import clean_title, fix_missing_metadata
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def connect_db():
    """Connect to MongoDB"""
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    database = client[settings.MONGODB_DB_NAME]

    await init_beanie(
        database=database,
        document_models=[Content, LibrarianAction]
    )
    logger.info("✅ Connected to MongoDB")


def test_clean_title_function():
    """Test the clean_title function with various inputs"""
    logger.info("\n" + "="*80)
    logger.info("TESTING CLEAN_TITLE FUNCTION")
    logger.info("="*80)

    test_cases = [
        ("Coco p Rip -EVO", "Coco"),
        ("Django Unchained Upscaled Soup", "Django Unchained"),
        ("Ice Age p multisub-HighCode", "Ice Age"),
        ("The Matrix 1080p BluRay x264-SPARKS", "The Matrix"),
        ("Inception.2010.720p.BRRip.x264.AAC-ETRG", "Inception"),
        ("Breaking Bad", "Breaking Bad"),  # Should remain unchanged
        ("Game of Thrones S01E01", "Game of Thrones S01E01"),  # Should remain unchanged
    ]

    all_passed = True
    for original, expected in test_cases:
        cleaned = clean_title(original)
        passed = cleaned == expected
        status = "✅" if passed else "❌"
        logger.info(f"{status} '{original}' → '{cleaned}' (expected: '{expected}')")
        if not passed:
            all_passed = False

    logger.info("="*80)
    if all_passed:
        logger.info("✅ All clean_title tests passed!")
    else:
        logger.error("❌ Some clean_title tests failed!")

    return all_passed


async def test_auto_fixer_integration():
    """Test the auto_fixer's ability to handle messy titles"""
    logger.info("\n" + "="*80)
    logger.info("TESTING AUTO_FIXER INTEGRATION")
    logger.info("="*80)

    try:
        # Find a content item without TMDB ID (failed enrichment)
        failed_content = await Content.find_one(
            Content.tmdb_id == None
        )

        if not failed_content:
            logger.info("ℹ️  No content without TMDB ID found (all items already enriched)")
            logger.info("Creating a test item with messy title...")

            # Create a temporary test item
            test_content = Content(
                title="Ice Age p multisub-HighCode",
                year=2002,
                is_series=False,
                is_published=True,
                content_type="movie"
            )
            await test_content.insert()
            logger.info(f"✅ Created test item: {test_content.title}")
            test_id = str(test_content.id)
            is_test_item = True
        else:
            logger.info(f"📝 Found content without TMDB ID: {failed_content.title}")
            test_id = str(failed_content.id)
            is_test_item = False

        # Test the auto_fixer
        logger.info(f"\n🔧 Testing auto_fixer on content ID: {test_id}")

        result = await fix_missing_metadata(
            content_id=test_id,
            issues=["missing_tmdb_id", "missing_thumbnail", "missing_backdrop"],
            audit_id="test-audit-001"
        )

        logger.info("\n" + "-"*80)
        if result.success:
            logger.info("✅ AUTO_FIXER SUCCESS!")
            logger.info(f"   Fields updated: {result.fields_updated}")
            logger.info(f"   Action ID: {result.action_id}")

            # Verify the content was updated
            updated_content = await Content.get(test_id)
            logger.info("\n📊 Updated Content:")
            logger.info(f"   Title: {updated_content.title}")
            logger.info(f"   TMDB ID: {updated_content.tmdb_id}")
            logger.info(f"   IMDB ID: {updated_content.imdb_id}")
            logger.info(f"   Has Thumbnail: {bool(updated_content.thumbnail)}")
            logger.info(f"   Has Backdrop: {bool(updated_content.backdrop)}")
            logger.info(f"   Has Description: {bool(updated_content.description)}")

            # Clean up test item
            if is_test_item:
                await updated_content.delete()
                logger.info("\n🧹 Cleaned up test item")

            return True
        else:
            logger.error(f"❌ AUTO_FIXER FAILED: {result.error_message}")

            # Clean up test item
            if is_test_item:
                test_content = await Content.get(test_id)
                if test_content:
                    await test_content.delete()
                logger.info("\n🧹 Cleaned up test item")

            return False

    except Exception as e:
        logger.error(f"❌ Test failed with exception: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def test_real_failed_items():
    """Test on real failed items from the database"""
    logger.info("\n" + "="*80)
    logger.info("TESTING ON REAL FAILED ITEMS")
    logger.info("="*80)

    try:
        # Find up to 3 items without TMDB ID
        failed_items = await Content.find(
            Content.tmdb_id == None
        ).limit(3).to_list()

        if not failed_items:
            logger.info("✨ No failed items found - all content already enriched!")
            return True

        logger.info(f"📋 Found {len(failed_items)} items without TMDB ID")
        logger.info("\nItems to test:")
        for idx, item in enumerate(failed_items, 1):
            logger.info(f"  {idx}. {item.title} ({item.year})")

        logger.info("\n" + "-"*80)

        success_count = 0
        for idx, item in enumerate(failed_items, 1):
            logger.info(f"\n[{idx}/{len(failed_items)}] Testing: {item.title}")

            result = await fix_missing_metadata(
                content_id=str(item.id),
                issues=["missing_tmdb_id", "missing_thumbnail"],
                audit_id="test-audit-real"
            )

            if result.success:
                success_count += 1
                logger.info(f"   ✅ Success! Updated: {result.fields_updated}")
            else:
                logger.warning(f"   ⚠️  Failed: {result.error_message}")

        logger.info("\n" + "="*80)
        logger.info(f"RESULTS: {success_count}/{len(failed_items)} items successfully enriched")
        logger.info("="*80)

        return success_count > 0

    except Exception as e:
        logger.error(f"❌ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    """Run all tests"""
    logger.info("🧪 LIBRARIAN TITLE CLEANING TEST SUITE")
    logger.info("="*80)

    # Test 1: Clean title function
    test1_passed = test_clean_title_function()

    # Test 2: Database integration
    await connect_db()
    test2_passed = await test_auto_fixer_integration()

    # Test 3: Real failed items
    test3_passed = await test_real_failed_items()

    # Final summary
    logger.info("\n" + "="*80)
    logger.info("FINAL TEST RESULTS")
    logger.info("="*80)
    logger.info(f"✅ Clean Title Function:      {'PASSED' if test1_passed else 'FAILED'}")
    logger.info(f"✅ Auto-Fixer Integration:    {'PASSED' if test2_passed else 'FAILED'}")
    logger.info(f"✅ Real Failed Items Test:    {'PASSED' if test3_passed else 'FAILED'}")
    logger.info("="*80)

    all_passed = test1_passed and test2_passed and test3_passed
    if all_passed:
        logger.info("🎉 ALL TESTS PASSED!")
        return 0
    else:
        logger.error("❌ SOME TESTS FAILED")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
