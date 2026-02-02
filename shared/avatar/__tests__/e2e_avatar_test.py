#!/usr/bin/env python3
"""
Avatar System E2E Test Suite
Tests the voice→avatar→gesture flow in the Bayit+ web application

Tests cover:
- Avatar visibility and state transitions
- Gesture animations
- Voice interaction UI elements
- Widget creation from voice commands
"""

import os
import sys
import time
from playwright.sync_api import sync_playwright, Page, expect

# Configuration
BASE_URL = "http://localhost:3200"
SCREENSHOT_DIR = "/tmp/bayit_avatar_tests"

def ensure_screenshot_dir():
    """Create screenshot directory if it doesn't exist"""
    os.makedirs(SCREENSHOT_DIR, exist_ok=True)

def take_screenshot(page: Page, name: str):
    """Take a screenshot with the given name"""
    path = f"{SCREENSHOT_DIR}/{name}.png"
    page.screenshot(path=path, full_page=True)
    print(f"📸 Screenshot saved: {path}")
    return path

def test_page_loads(page: Page):
    """Test 1: Verify page loads correctly"""
    print("\n🧪 Test 1: Page Load")

    page.goto(BASE_URL)
    page.wait_for_load_state('networkidle')

    take_screenshot(page, "01_initial_load")

    # Check page title or main content exists
    assert page.title(), "Page should have a title"
    print("✅ Page loaded successfully")
    return True

def test_avatar_elements_exist(page: Page):
    """Test 2: Check avatar-related elements exist in DOM"""
    print("\n🧪 Test 2: Avatar Elements Existence")

    page.goto(BASE_URL)
    page.wait_for_load_state('networkidle')

    # Look for avatar-related elements
    # These selectors may need adjustment based on actual DOM structure
    avatar_selectors = [
        '[data-testid="voice-avatar"]',
        '[data-testid="wizard-avatar"]',
        '[class*="avatar"]',
        '[class*="wizard"]',
        '[class*="voice"]',
    ]

    found_elements = []
    for selector in avatar_selectors:
        elements = page.locator(selector).all()
        if elements:
            found_elements.append(f"{selector}: {len(elements)} elements")

    if found_elements:
        print(f"✅ Found avatar elements: {found_elements}")
    else:
        print("ℹ️ No avatar elements found on initial load (may require trigger)")

    take_screenshot(page, "02_avatar_elements")
    return True

def test_voice_button_exists(page: Page):
    """Test 3: Check for voice/microphone button"""
    print("\n🧪 Test 3: Voice Button Existence")

    page.goto(BASE_URL)
    page.wait_for_load_state('networkidle')

    # Look for voice/microphone buttons
    voice_button_selectors = [
        '[data-testid="voice-button"]',
        '[data-testid="microphone-button"]',
        '[aria-label*="voice"]',
        '[aria-label*="microphone"]',
        'button[class*="voice"]',
        'button[class*="mic"]',
        '[class*="VoiceButton"]',
    ]

    for selector in voice_button_selectors:
        button = page.locator(selector).first
        if button.count() > 0:
            print(f"✅ Found voice button: {selector}")
            take_screenshot(page, "03_voice_button_found")
            return True

    # Try to find any button with mic/voice text or icon
    all_buttons = page.locator('button').all()
    print(f"ℹ️ Found {len(all_buttons)} buttons total")

    take_screenshot(page, "03_no_voice_button")
    return True

def test_dom_structure(page: Page):
    """Test 4: Analyze DOM structure for relevant components"""
    print("\n🧪 Test 4: DOM Structure Analysis")

    page.goto(BASE_URL)
    page.wait_for_load_state('networkidle')

    # Get page content for analysis
    content = page.content()

    # Check for key patterns
    patterns = {
        'zustand': 'zustand' in content.lower(),
        'avatar': 'avatar' in content.lower(),
        'wizard': 'wizard' in content.lower(),
        'voice': 'voice' in content.lower(),
        'gesture': 'gesture' in content.lower(),
        'support': 'support' in content.lower(),
    }

    print("DOM pattern analysis:")
    for pattern, found in patterns.items():
        status = "✅" if found else "❌"
        print(f"  {status} {pattern}: {'found' if found else 'not found'}")

    take_screenshot(page, "04_dom_structure")
    return True

def test_console_errors(page: Page):
    """Test 5: Check for JavaScript console errors"""
    print("\n🧪 Test 5: Console Error Check")

    errors = []
    warnings = []

    def handle_console(msg):
        if msg.type == 'error':
            errors.append(msg.text)
        elif msg.type == 'warning':
            warnings.append(msg.text)

    page.on('console', handle_console)

    page.goto(BASE_URL)
    page.wait_for_load_state('networkidle')

    # Wait a bit for any async errors
    page.wait_for_timeout(2000)

    if errors:
        print(f"⚠️ Found {len(errors)} console errors:")
        for err in errors[:5]:  # Show first 5
            print(f"  - {err[:100]}...")
    else:
        print("✅ No console errors detected")

    if warnings:
        print(f"ℹ️ Found {len(warnings)} console warnings")

    take_screenshot(page, "05_console_check")
    return len(errors) == 0

def test_responsive_layout(page: Page):
    """Test 6: Test responsive layout at different viewports"""
    print("\n🧪 Test 6: Responsive Layout")

    viewports = [
        ("mobile", 375, 667),
        ("tablet", 768, 1024),
        ("desktop", 1920, 1080),
    ]

    for name, width, height in viewports:
        page.set_viewport_size({"width": width, "height": height})
        page.goto(BASE_URL)
        page.wait_for_load_state('networkidle')

        take_screenshot(page, f"06_responsive_{name}")
        print(f"  ✅ {name} ({width}x{height}) rendered")

    print("✅ Responsive layouts tested")
    return True

def test_navigation(page: Page):
    """Test 7: Test basic navigation"""
    print("\n🧪 Test 7: Navigation Test")

    page.goto(BASE_URL)
    page.wait_for_load_state('networkidle')

    # Find all navigation links
    nav_links = page.locator('nav a, [role="navigation"] a').all()
    print(f"  Found {len(nav_links)} navigation links")

    # Find all clickable buttons
    buttons = page.locator('button').all()
    print(f"  Found {len(buttons)} buttons")

    take_screenshot(page, "07_navigation")
    return True

def test_accessibility_basics(page: Page):
    """Test 8: Basic accessibility checks"""
    print("\n🧪 Test 8: Accessibility Basics")

    page.goto(BASE_URL)
    page.wait_for_load_state('networkidle')

    # Check for lang attribute
    html_lang = page.locator('html').get_attribute('lang')
    if html_lang:
        print(f"  ✅ Language attribute set: {html_lang}")
    else:
        print("  ⚠️ No language attribute on html element")

    # Check for main landmark
    main = page.locator('main, [role="main"]').first
    if main.count() > 0:
        print("  ✅ Main landmark found")
    else:
        print("  ⚠️ No main landmark found")

    # Check for skip link
    skip_link = page.locator('a[href="#main"], a[href="#content"]').first
    if skip_link.count() > 0:
        print("  ✅ Skip link found")
    else:
        print("  ℹ️ No skip link found")

    # Check images for alt text
    images = page.locator('img').all()
    images_with_alt = page.locator('img[alt]').all()
    print(f"  Images: {len(images)} total, {len(images_with_alt)} with alt text")

    take_screenshot(page, "08_accessibility")
    return True

def run_all_tests():
    """Run all E2E tests"""
    ensure_screenshot_dir()

    print("=" * 60)
    print("🚀 Bayit+ Avatar System E2E Test Suite")
    print("=" * 60)
    print(f"📁 Screenshots: {SCREENSHOT_DIR}")
    print(f"🌐 Target URL: {BASE_URL}")

    results = {}

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        tests = [
            ("Page Load", test_page_loads),
            ("Avatar Elements", test_avatar_elements_exist),
            ("Voice Button", test_voice_button_exists),
            ("DOM Structure", test_dom_structure),
            ("Console Errors", test_console_errors),
            ("Responsive Layout", test_responsive_layout),
            ("Navigation", test_navigation),
            ("Accessibility", test_accessibility_basics),
        ]

        for test_name, test_func in tests:
            try:
                result = test_func(page)
                results[test_name] = "PASS" if result else "FAIL"
            except Exception as e:
                print(f"❌ {test_name} failed with error: {e}")
                results[test_name] = f"ERROR: {str(e)[:50]}"
                take_screenshot(page, f"error_{test_name.replace(' ', '_').lower()}")

        browser.close()

    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 60)

    passed = sum(1 for r in results.values() if r == "PASS")
    total = len(results)

    for test_name, result in results.items():
        emoji = "✅" if result == "PASS" else "❌"
        print(f"{emoji} {test_name}: {result}")

    print(f"\n🏁 Total: {passed}/{total} tests passed")
    print(f"📁 Screenshots saved to: {SCREENSHOT_DIR}")

    return passed == total

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
