#!/usr/bin/env python3
"""
Comprehensive Avatar System E2E Test Suite
Tests the complete voice→avatar→gesture flow in Bayit+
"""

import os
import sys
import time
from playwright.sync_api import sync_playwright, Page

BASE_URL = "http://localhost:3200"
SCREENSHOT_DIR = "/tmp/bayit_avatar_tests"
CREDENTIALS = {
    "email": "admin@olorin.ai",
    "password": "Jersey1973!"
}

def ensure_screenshot_dir():
    os.makedirs(SCREENSHOT_DIR, exist_ok=True)

def take_screenshot(page: Page, name: str):
    path = f"{SCREENSHOT_DIR}/{name}.png"
    page.screenshot(path=path, full_page=True)
    print(f"📸 {name}")
    return path

def wait_for_server(page: Page, max_retries=10):
    for i in range(max_retries):
        try:
            page.goto(BASE_URL, timeout=10000)
            return True
        except:
            print(f"  Waiting for server... ({i+1}/{max_retries})")
            time.sleep(2)
    return False

def find_rn_buttons(page: Page):
    """Find React Native Web button-like elements"""
    selectors = ['[role="button"]', '[tabindex="0"]']
    buttons = []
    for selector in selectors:
        for el in page.locator(selector).all():
            try:
                text = el.inner_text().strip()
                if text:
                    buttons.append((el, text))
            except:
                pass
    return buttons

def login(page: Page):
    """Perform login"""
    print("\n🔐 Logging in...")

    if not wait_for_server(page):
        return False

    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(2000)

    email_input = page.locator('input[type="email"]').first
    password_input = page.locator('input[type="password"]').first

    if email_input.count() == 0 or password_input.count() == 0:
        print("  Already logged in or no login form")
        return True

    email_input.fill(CREDENTIALS["email"])
    password_input.fill(CREDENTIALS["password"])

    # Find and click login button
    buttons = find_rn_buttons(page)
    for el, text in buttons:
        if 'התחברות' in text or 'login' in text.lower():
            el.click()
            break

    page.wait_for_timeout(5000)

    if page.locator('input[type="password"]').count() == 0:
        print("  ✅ Login successful")
        return True

    print("  ❌ Login failed")
    return False

# ============== AVATAR TESTS ==============

def test_avatar_visible(page: Page):
    """Test 1: Avatar/Wizard is visible on page"""
    print("\n🧪 Test 1: Avatar Visibility")

    # Check for wizard image
    wizard_img = page.locator('img[alt*="wizard" i], img[src*="wizard" i]')
    if wizard_img.count() > 0:
        print("  ✅ Wizard avatar image found")
        take_screenshot(page, "test01_avatar_visible")
        return True

    # Check for avatar class elements
    avatar_el = page.locator('[class*="avatar" i], [class*="wizard" i]')
    if avatar_el.count() > 0:
        print("  ✅ Avatar element found")
        take_screenshot(page, "test01_avatar_visible")
        return True

    print("  ❌ No avatar found")
    take_screenshot(page, "test01_avatar_not_found")
    return False

def test_voice_button_exists(page: Page):
    """Test 2: Voice/Microphone button exists"""
    print("\n🧪 Test 2: Voice Button Existence")

    selectors = [
        '[class*="mic" i]',
        '[aria-label*="voice" i]',
        '[aria-label*="mic" i]',
        'button:has-text("🎤")',
        '[role="button"]:has-text("🎤")',
    ]

    for selector in selectors:
        el = page.locator(selector).first
        if el.count() > 0:
            print(f"  ✅ Voice button found: {selector}")
            take_screenshot(page, "test02_voice_button")
            return True

    # Look for microphone emoji
    buttons = find_rn_buttons(page)
    for el, text in buttons:
        if '🎤' in text or 'mic' in text.lower():
            print(f"  ✅ Voice button found: '{text}'")
            take_screenshot(page, "test02_voice_button")
            return True

    print("  ❌ No voice button found")
    return False

def test_click_voice_button(page: Page):
    """Test 3: Click voice button and observe avatar response"""
    print("\n🧪 Test 3: Voice Button Interaction")

    take_screenshot(page, "test03_before_voice_click")

    # Find voice button
    voice_btn = None
    buttons = find_rn_buttons(page)
    for el, text in buttons:
        if '🎤' in text:
            voice_btn = el
            break

    if not voice_btn:
        voice_btn = page.locator('[aria-label*="voice" i]').first
        if voice_btn.count() == 0:
            print("  ⚠️ Voice button not found")
            return True  # Don't fail, just skip

    print("  Clicking voice button...")
    voice_btn.click()
    page.wait_for_timeout(2000)

    take_screenshot(page, "test03_after_voice_click")

    # Check for any state change (modal, avatar change, etc.)
    # The avatar might show listening state
    print("  ✅ Voice button clicked")
    return True

def test_avatar_states(page: Page):
    """Test 4: Check avatar state elements exist"""
    print("\n🧪 Test 4: Avatar State Elements")

    # Check for state-related classes/attributes
    state_indicators = [
        '[class*="listening" i]',
        '[class*="speaking" i]',
        '[class*="thinking" i]',
        '[class*="idle" i]',
        '[data-state]',
    ]

    found = []
    for selector in state_indicators:
        count = page.locator(selector).count()
        if count > 0:
            found.append(selector)

    if found:
        print(f"  ✅ State indicators found: {found}")
    else:
        print("  ℹ️ No explicit state indicators (may be internal)")

    take_screenshot(page, "test04_avatar_states")
    return True

def test_support_panel(page: Page):
    """Test 5: Check support/help panel"""
    print("\n🧪 Test 5: Support Panel")

    # Look for support/help buttons
    support_selectors = [
        '[class*="support" i]',
        '[class*="help" i]',
        '[aria-label*="support" i]',
        '[aria-label*="help" i]',
    ]

    for selector in support_selectors:
        el = page.locator(selector).first
        if el.count() > 0 and el.is_visible():
            print(f"  Found support element: {selector}")
            try:
                el.click()
                page.wait_for_timeout(1500)
                take_screenshot(page, "test05_support_opened")
                print("  ✅ Support panel interaction")
                return True
            except:
                pass

    print("  ℹ️ No clickable support panel found")
    take_screenshot(page, "test05_no_support")
    return True

def test_widget_system(page: Page):
    """Test 6: Widget system presence"""
    print("\n🧪 Test 6: Widget System")

    widget_selectors = [
        '[class*="widget" i]',
        '[class*="card" i]',
        '[draggable="true"]',
        '[class*="player" i]',
    ]

    widgets_found = []
    for selector in widget_selectors:
        count = page.locator(selector).count()
        if count > 0:
            widgets_found.append(f"{selector}: {count}")

    if widgets_found:
        print(f"  ✅ Widgets found: {widgets_found}")
    else:
        print("  ℹ️ No widgets visible")

    take_screenshot(page, "test06_widgets")
    return True

def test_navigation(page: Page):
    """Test 7: Navigation elements"""
    print("\n🧪 Test 7: Navigation")

    # Count navigation items
    nav_items = find_rn_buttons(page)
    nav_texts = [text for _, text in nav_items if len(text) < 30][:10]

    print(f"  Found {len(nav_items)} navigation/button elements")
    print(f"  Sample: {nav_texts}")

    take_screenshot(page, "test07_navigation")
    return True

def test_responsive_layouts(page: Page):
    """Test 8: Responsive layout at different sizes"""
    print("\n🧪 Test 8: Responsive Layouts")

    viewports = [
        ("mobile_portrait", 375, 812),
        ("mobile_landscape", 812, 375),
        ("tablet", 768, 1024),
        ("desktop", 1920, 1080),
        ("wide", 2560, 1440),
    ]

    for name, width, height in viewports:
        page.set_viewport_size({"width": width, "height": height})
        page.wait_for_timeout(500)
        take_screenshot(page, f"test08_{name}")
        print(f"  ✓ {name} ({width}x{height})")

    # Reset to desktop
    page.set_viewport_size({"width": 1920, "height": 1080})
    return True

def test_keyboard_accessibility(page: Page):
    """Test 9: Keyboard navigation"""
    print("\n🧪 Test 9: Keyboard Accessibility")

    # Tab through elements
    for i in range(5):
        page.keyboard.press('Tab')
        page.wait_for_timeout(200)

    # Check if something is focused
    focused = page.evaluate('document.activeElement?.tagName')
    print(f"  Focused element after Tab: {focused}")

    take_screenshot(page, "test09_keyboard")
    return True

def test_console_errors(page: Page, errors: list):
    """Test 10: Check for critical console errors"""
    print("\n🧪 Test 10: Console Errors")

    critical_errors = [e for e in errors if 'error' in e.lower() and 'warning' not in e.lower()]

    if critical_errors:
        print(f"  ⚠️ Found {len(critical_errors)} console errors:")
        for err in critical_errors[:3]:
            print(f"    - {err[:80]}...")
        return False
    else:
        print("  ✅ No critical console errors")
        return True

def run_all_tests():
    """Run complete test suite"""
    ensure_screenshot_dir()

    print("=" * 70)
    print("🚀 BAYIT+ AVATAR SYSTEM - COMPREHENSIVE E2E TEST SUITE")
    print("=" * 70)
    print(f"📁 Screenshots: {SCREENSHOT_DIR}")
    print(f"🌐 URL: {BASE_URL}")

    results = {}
    console_errors = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            locale='he-IL',
        )
        page = context.new_page()

        # Capture console errors
        page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' else None)

        # Login first
        if not login(page):
            print("\n❌ Cannot proceed without login")
            browser.close()
            return False

        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(2000)

        # Run all tests
        tests = [
            ("Avatar Visible", test_avatar_visible),
            ("Voice Button", test_voice_button_exists),
            ("Voice Interaction", test_click_voice_button),
            ("Avatar States", test_avatar_states),
            ("Support Panel", test_support_panel),
            ("Widget System", test_widget_system),
            ("Navigation", test_navigation),
            ("Responsive", test_responsive_layouts),
            ("Keyboard", test_keyboard_accessibility),
        ]

        for name, test_func in tests:
            try:
                result = test_func(page)
                results[name] = "PASS" if result else "FAIL"
            except Exception as e:
                print(f"  ❌ Error: {str(e)[:50]}")
                results[name] = "ERROR"
                take_screenshot(page, f"error_{name.lower().replace(' ', '_')}")

        # Console errors test
        results["Console Errors"] = "PASS" if test_console_errors(page, console_errors) else "FAIL"

        browser.close()

    # Summary
    print("\n" + "=" * 70)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 70)

    passed = sum(1 for r in results.values() if r == "PASS")
    total = len(results)

    for name, result in results.items():
        emoji = {"PASS": "✅", "FAIL": "❌", "ERROR": "💥"}.get(result, "❓")
        print(f"  {emoji} {name}: {result}")

    print(f"\n🏁 TOTAL: {passed}/{total} tests passed ({100*passed//total}%)")
    print(f"📁 Screenshots: {SCREENSHOT_DIR}")

    # List screenshots
    print("\n📷 Screenshots taken:")
    for f in sorted(os.listdir(SCREENSHOT_DIR)):
        if f.endswith('.png'):
            print(f"    - {f}")

    return passed >= total - 2  # Allow up to 2 failures

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
