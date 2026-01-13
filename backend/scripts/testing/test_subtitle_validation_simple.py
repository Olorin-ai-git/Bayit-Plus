"""
Simple test for subtitle validation without database dependency
"""
import asyncio
import sys
from pathlib import Path
from dataclasses import dataclass
from typing import List

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))


@dataclass
class MockContent:
    """Mock Content object for testing"""
    id: str
    title: str
    thumbnail: str
    backdrop: str
    description: str
    genre: str
    tmdb_id: int
    imdb_id: str
    is_series: bool
    has_subtitles: bool
    available_subtitle_languages: List[str]


async def test_subtitle_validation():
    """Test the subtitle validation logic"""
    print("=" * 80)
    print("Testing Subtitle Validation in Librarian AI Agent")
    print("=" * 80)

    # Import the function
    from app.services.content_auditor import check_metadata_completeness

    # Test Case 1: Movie with NO subtitles
    print("\n1️⃣  Test Case 1: Movie with NO subtitles")
    content1 = MockContent(
        id="test1",
        title="Test Movie 1 - No Subtitles",
        thumbnail="https://example.com/thumb.jpg",
        backdrop="https://example.com/backdrop.jpg",
        description="A test movie with no subtitles for testing validation",
        genre="Drama",
        tmdb_id=12345,
        imdb_id="tt1234567",
        is_series=False,
        has_subtitles=False,  # NO SUBTITLES
        available_subtitle_languages=[],
    )

    result1 = await check_metadata_completeness([content1])
    print(f"   Issues found: {result1[0]['issues'] if result1 else 'None'}")
    assert result1, "Should find issues"
    assert "missing_subtitles" in result1[0]["issues"], "Should flag missing_subtitles"
    assert "insufficient_subtitle_languages" in result1[0]["issues"], "Should flag insufficient languages"
    print("   ✅ PASS: Detected missing subtitles and insufficient languages")

    # Test Case 2: Movie with only 1 language (insufficient)
    print("\n2️⃣  Test Case 2: Movie with only 1 subtitle language (insufficient)")
    content2 = MockContent(
        id="test2",
        title="Test Movie 2 - Only English",
        thumbnail="https://example.com/thumb.jpg",
        backdrop="https://example.com/backdrop.jpg",
        description="A test movie with only English subtitles",
        genre="Drama",
        tmdb_id=12346,
        imdb_id="tt1234568",
        is_series=False,
        has_subtitles=True,
        available_subtitle_languages=["en"],  # Only 1 language
    )

    result2 = await check_metadata_completeness([content2])
    print(f"   Issues found: {result2[0]['issues'] if result2 else 'None'}")
    assert result2, "Should find issues"
    assert "missing_subtitles" not in result2[0]["issues"], "Should NOT flag missing_subtitles (has_subtitles=True)"
    assert "insufficient_subtitle_languages" in result2[0]["issues"], "Should flag insufficient languages (only 1)"
    print("   ✅ PASS: Detected insufficient languages (1 < 3)")

    # Test Case 3: Movie with 2 languages (still insufficient)
    print("\n3️⃣  Test Case 3: Movie with 2 subtitle languages (still insufficient)")
    content3 = MockContent(
        id="test3",
        title="Test Movie 3 - English and Hebrew",
        thumbnail="https://example.com/thumb.jpg",
        backdrop="https://example.com/backdrop.jpg",
        description="A test movie with English and Hebrew subtitles",
        genre="Drama",
        tmdb_id=12347,
        imdb_id="tt1234569",
        is_series=False,
        has_subtitles=True,
        available_subtitle_languages=["en", "he"],  # Only 2 languages
    )

    result3 = await check_metadata_completeness([content3])
    print(f"   Issues found: {result3[0]['issues'] if result3 else 'None'}")
    assert result3, "Should find issues"
    assert "insufficient_subtitle_languages" in result3[0]["issues"], "Should flag insufficient languages (2 < 3)"
    print("   ✅ PASS: Detected insufficient languages (2 < 3)")

    # Test Case 4: Movie with exactly 3 languages (VALID)
    print("\n4️⃣  Test Case 4: Movie with 3 subtitle languages (VALID)")
    content4 = MockContent(
        id="test4",
        title="Test Movie 4 - Three Languages",
        thumbnail="https://example.com/thumb.jpg",
        backdrop="https://example.com/backdrop.jpg",
        description="A test movie with English, Hebrew, and Spanish subtitles",
        genre="Drama",
        tmdb_id=12348,
        imdb_id="tt1234570",
        is_series=False,
        has_subtitles=True,
        available_subtitle_languages=["en", "he", "es"],  # 3 languages - VALID!
    )

    result4 = await check_metadata_completeness([content4])
    print(f"   Issues found: {result4[0]['issues'] if result4 else 'None'}")
    # Should have no subtitle-related issues
    if result4:
        assert "missing_subtitles" not in result4[0]["issues"], "Should NOT flag missing_subtitles"
        assert "insufficient_subtitle_languages" not in result4[0]["issues"], "Should NOT flag insufficient languages (has 3)"
    print("   ✅ PASS: No subtitle issues detected (has 3 languages)")

    # Test Case 5: Series with 1 language (should be OK - only movies require 3)
    print("\n5️⃣  Test Case 5: Series with 1 language (should be OK)")
    content5 = MockContent(
        id="test5",
        title="Test Series 1 - Only English",
        thumbnail="https://example.com/thumb.jpg",
        backdrop="https://example.com/backdrop.jpg",
        description="A test series with only English subtitles",
        genre="Drama",
        tmdb_id=12349,
        imdb_id="",
        is_series=True,  # SERIES, not movie
        has_subtitles=True,
        available_subtitle_languages=["en"],  # Only 1 language
    )

    result5 = await check_metadata_completeness([content5])
    print(f"   Issues found: {result5[0]['issues'] if result5 else 'None'}")
    # Series shouldn't be flagged for insufficient languages
    if result5:
        assert "insufficient_subtitle_languages" not in result5[0]["issues"], "Should NOT flag series for insufficient languages"
    print("   ✅ PASS: Series not flagged (only movies require 3 languages)")

    # Test Case 6: Movie with 6 languages (more than minimum - VALID)
    print("\n6️⃣  Test Case 6: Movie with 6 languages (exceeds minimum - VALID)")
    content6 = MockContent(
        id="test6",
        title="Test Movie 5 - Six Languages",
        thumbnail="https://example.com/thumb.jpg",
        backdrop="https://example.com/backdrop.jpg",
        description="A test movie with six subtitle languages",
        genre="Drama",
        tmdb_id=12350,
        imdb_id="tt1234571",
        is_series=False,
        has_subtitles=True,
        available_subtitle_languages=["en", "he", "es", "ar", "ru", "fr"],  # 6 languages
    )

    result6 = await check_metadata_completeness([content6])
    print(f"   Issues found: {result6[0]['issues'] if result6 else 'None'}")
    if result6:
        assert "insufficient_subtitle_languages" not in result6[0]["issues"], "Should NOT flag (has 6 languages)"
    print("   ✅ PASS: No subtitle issues detected (has 6 languages)")

    print("\n" + "=" * 80)
    print("✅ ALL TESTS PASSED")
    print("=" * 80)
    print("\n📋 Summary:")
    print("   • Movies with no subtitles are flagged")
    print("   • Movies with <3 languages are flagged")
    print("   • Movies with ≥3 languages pass validation")
    print("   • Series are not subject to the 3-language requirement")
    print("   • Validation works correctly with all test cases")


if __name__ == "__main__":
    asyncio.run(test_subtitle_validation())
