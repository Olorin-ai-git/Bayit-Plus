#!/usr/bin/env python3
"""
Verify SSRF Protection Configuration
Tests that SSRF domain whitelists are properly configured and functional.
"""

import sys
from app.core.config import settings
from app.core.ssrf_protection import (
    validate_image_url,
    validate_audio_url,
    validate_subtitle_url,
    validate_epg_url,
    validate_scraper_url,
)


def test_domain_parsing():
    """Test that domain lists are properly parsed."""
    print("=" * 70)
    print("SSRF CONFIGURATION VERIFICATION")
    print("=" * 70)
    print()

    # Check parsed domains
    categories = {
        "ALLOWED_IMAGE_DOMAINS": settings.parsed_image_domains,
        "ALLOWED_AUDIO_DOMAINS": settings.parsed_audio_domains,
        "ALLOWED_SUBTITLE_DOMAINS": settings.parsed_subtitle_domains,
        "ALLOWED_EPG_DOMAINS": settings.parsed_epg_domains,
        "ALLOWED_SCRAPER_DOMAINS": settings.parsed_scraper_domains,
    }

    all_ok = True

    for name, domains in categories.items():
        print(f"{name}:")
        if not domains:
            print("  ⚠️  WARNING: No domains configured (using defaults)")
            all_ok = False
        else:
            print(f"  ✓ {len(domains)} domains configured")
            for domain in domains[:3]:  # Show first 3
                print(f"    - {domain}")
            if len(domains) > 3:
                print(f"    ... and {len(domains) - 3} more")
        print()

    return all_ok


def test_validation_functions():
    """Test that validation functions work correctly."""
    print("-" * 70)
    print("VALIDATION FUNCTION TESTS")
    print("-" * 70)
    print()

    tests = [
        # Test whitelisted domains (should pass)
        ("Image - TMDB", validate_image_url, "https://image.tmdb.org/poster.jpg", True),
        ("Audio - Spotify", validate_audio_url, "https://spotify.com/podcast.mp3", True),
        ("Subtitle - OpenSubtitles", validate_subtitle_url, "https://api.opensubtitles.com/subtitle.srt", True),
        ("EPG - Kan", validate_epg_url, "https://www.kan.org.il/schedule", True),
        ("Scraper - YouTube", validate_scraper_url, "https://www.youtube.com/feed", True),

        # Test non-whitelisted domains (should fail)
        ("Image - Evil Domain", validate_image_url, "https://evil.com/image.jpg", False),
        ("Audio - Evil Domain", validate_audio_url, "https://evil.com/audio.mp3", False),

        # Test localhost (should fail)
        ("Image - Localhost", validate_image_url, "http://localhost:8080/image.jpg", False),
        ("Audio - Internal IP", validate_audio_url, "http://192.168.1.1/audio.mp3", False),

        # Test invalid URLs (should fail)
        ("Image - No Protocol", validate_image_url, "image.tmdb.org/poster.jpg", False),
        ("Audio - FTP Protocol", validate_audio_url, "ftp://spotify.com/podcast.mp3", False),
    ]

    passed = 0
    failed = 0

    for test_name, validator, url, expected in tests:
        result = validator(url)
        status = "✓" if result == expected else "✗"
        passed += 1 if result == expected else 0
        failed += 1 if result != expected else 0

        result_text = "PASS" if result == expected else "FAIL"
        print(f"{status} {test_name}: {result_text}")
        if result != expected:
            print(f"  Expected: {expected}, Got: {result}")
            print(f"  URL: {url}")

    print()
    print(f"Tests: {passed} passed, {failed} failed")
    print()

    return failed == 0


def main():
    """Run all verification tests."""
    print()

    # Test 1: Domain parsing
    parsing_ok = test_domain_parsing()

    # Test 2: Validation functions
    validation_ok = test_validation_functions()

    # Summary
    print("=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print()

    if parsing_ok and validation_ok:
        print("✅ All SSRF protection checks PASSED")
        print()
        print("Configuration is correct and functional.")
        print()
        return 0
    else:
        print("⚠️  Some SSRF protection checks FAILED")
        print()
        if not parsing_ok:
            print("Issue: Domain whitelists not properly configured")
            print("Solution: Run ./upload_ssrf_secrets.sh or configure .env")
        if not validation_ok:
            print("Issue: Validation functions not working correctly")
            print("Solution: Check app/core/ssrf_protection.py")
        print()
        return 1


if __name__ == "__main__":
    sys.exit(main())
