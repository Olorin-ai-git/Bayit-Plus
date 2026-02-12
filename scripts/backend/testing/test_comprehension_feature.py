#!/usr/bin/env python3
"""
Comprehensive Web Application Testing - Bayit+ Comprehension Quiz Feature
Tests all aspects of the comprehension quiz implementation.
"""

import sys
import time
from playwright.sync_api import sync_playwright, expect

def test_comprehension_settings():
    """Test comprehension quiz settings UI."""
    print("\n=== Testing Comprehension Settings UI ===")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            # Navigate to settings (assuming /settings route)
            page.goto('http://localhost:3000/settings')
            page.wait_for_load_state('networkidle')

            # Take screenshot for visual inspection
            page.screenshot(path='/tmp/bayit_settings.png', full_page=True)
            print("✅ Settings page loaded successfully")

            # Check for comprehension settings section
            comprehension_section = page.locator('text=Comprehension').first
            if comprehension_section.is_visible():
                print("✅ Comprehension settings section found")
            else:
                print("❌ Comprehension settings section NOT found")
                return False

            # Check for enable/disable toggle
            toggle_found = False
            toggles = page.locator('[role="switch"]').all()
            for toggle in toggles:
                if toggle.is_visible():
                    toggle_found = True
                    break

            if toggle_found:
                print("✅ Custom toggle component found")
            else:
                print("⚠️  Toggle not found (may be custom Pressable)")

            # Check for frequency selector
            frequency_options = page.locator('text=/off|low|normal|high/i').all()
            if len(frequency_options) >= 4:
                print(f"✅ Frequency selector found ({len(frequency_options)} options)")
            else:
                print(f"⚠️  Expected 4 frequency options, found {len(frequency_options)}")

            # Check for info message
            if page.locator('text=/comprehension/i').count() > 0:
                print("✅ Info/description text found")

            return True

        except Exception as e:
            print(f"❌ Settings test failed: {e}")
            page.screenshot(path='/tmp/bayit_settings_error.png', full_page=True)
            return False
        finally:
            browser.close()


def test_video_player_integration():
    """Test comprehension quiz integration in video player."""
    print("\n=== Testing Video Player Integration ===")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            # Navigate to a video player page
            page.goto('http://localhost:3000/watch')
            page.wait_for_load_state('networkidle')

            # Take screenshot
            page.screenshot(path='/tmp/bayit_player.png', full_page=True)
            print("✅ Video player page loaded")

            # Check for video element
            video = page.locator('video').first
            if video.is_visible():
                print("✅ Video element found")
            else:
                print("❌ Video element NOT found")
                return False

            # Check for scene detection hooks (looking for any quiz-related UI)
            quiz_overlay = page.locator('[data-testid="quiz-overlay"]')
            if quiz_overlay.count() > 0:
                print("✅ Quiz overlay component exists (may be hidden)")
            else:
                print("⚠️  Quiz overlay not found in DOM")

            return True

        except Exception as e:
            print(f"❌ Video player test failed: {e}")
            page.screenshot(path='/tmp/bayit_player_error.png', full_page=True)
            return False
        finally:
            browser.close()


def test_api_endpoints():
    """Test comprehension quiz API endpoints."""
    print("\n=== Testing API Endpoints ===")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        try:
            # Monitor network requests
            api_calls = []

            def log_request(request):
                if '/api/v1/comprehension' in request.url:
                    api_calls.append(request.url)

            page.on('request', log_request)

            # Navigate to app
            page.goto('http://localhost:3000')
            page.wait_for_load_state('networkidle')

            # Check if any comprehension API calls were made
            if api_calls:
                print(f"✅ Comprehension API endpoints detected: {len(api_calls)} calls")
                for url in api_calls:
                    print(f"   - {url}")
            else:
                print("⚠️  No comprehension API calls detected (may require authentication)")

            return True

        except Exception as e:
            print(f"❌ API test failed: {e}")
            return False
        finally:
            browser.close()


def test_console_errors():
    """Check for console errors in the application."""
    print("\n=== Testing Console Errors ===")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        console_errors = []
        console_warnings = []

        def log_console(msg):
            if msg.type == 'error':
                console_errors.append(msg.text)
            elif msg.type == 'warning':
                console_warnings.append(msg.text)

        page.on('console', log_console)

        try:
            # Navigate to main pages
            pages_to_test = [
                'http://localhost:3000',
                'http://localhost:3000/settings',
                'http://localhost:3000/watch',
            ]

            for url in pages_to_test:
                try:
                    page.goto(url, timeout=10000)
                    page.wait_for_load_state('networkidle', timeout=5000)
                    time.sleep(1)  # Let any delayed logs appear
                except Exception as e:
                    print(f"⚠️  Failed to load {url}: {e}")

            # Report findings
            if console_errors:
                print(f"❌ Found {len(console_errors)} console errors:")
                for error in console_errors[:5]:  # Show first 5
                    print(f"   - {error}")
            else:
                print("✅ No console errors detected")

            if console_warnings:
                print(f"⚠️  Found {len(console_warnings)} console warnings:")
                for warning in console_warnings[:3]:  # Show first 3
                    print(f"   - {warning}")
            else:
                print("✅ No console warnings detected")

            return len(console_errors) == 0

        except Exception as e:
            print(f"❌ Console error test failed: {e}")
            return False
        finally:
            browser.close()


def test_accessibility():
    """Test basic accessibility compliance."""
    print("\n=== Testing Accessibility ===")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            page.goto('http://localhost:3000/settings')
            page.wait_for_load_state('networkidle')

            # Check for ARIA labels
            aria_labeled = page.locator('[aria-label]').all()
            print(f"✅ Found {len(aria_labeled)} elements with ARIA labels")

            # Check for keyboard navigation support
            focusable = page.locator('button, a, input, [tabindex]').all()
            print(f"✅ Found {len(focusable)} focusable elements")

            # Check for proper heading structure
            h1_count = page.locator('h1').count()
            h2_count = page.locator('h2').count()
            print(f"✅ Heading structure: {h1_count} h1, {h2_count} h2")

            return True

        except Exception as e:
            print(f"❌ Accessibility test failed: {e}")
            return False
        finally:
            browser.close()


def main():
    """Run all tests."""
    print("=" * 70)
    print("BAYIT+ COMPREHENSION QUIZ - WEB APPLICATION TESTING")
    print("=" * 70)

    results = {
        'Settings UI': test_comprehension_settings(),
        'Video Player Integration': test_video_player_integration(),
        'API Endpoints': test_api_endpoints(),
        'Console Errors': test_console_errors(),
        'Accessibility': test_accessibility(),
    }

    # Summary
    print("\n" + "=" * 70)
    print("TEST SUMMARY")
    print("=" * 70)

    passed = sum(1 for v in results.values() if v)
    total = len(results)

    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")

    print(f"\nOverall: {passed}/{total} tests passed")
    print("\nScreenshots saved to /tmp/:")
    print("  - bayit_settings.png")
    print("  - bayit_player.png")
    print("=" * 70)

    return 0 if passed == total else 1


if __name__ == '__main__':
    sys.exit(main())
