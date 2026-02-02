#!/usr/bin/env python3
"""
Login Script for React Native Web - handles non-standard button elements
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
    print(f"📸 Screenshot: {path}")
    return path

def wait_for_server(page: Page, max_retries=10):
    for i in range(max_retries):
        try:
            page.goto(BASE_URL, timeout=10000)
            return True
        except Exception as e:
            print(f"  Waiting for server... (attempt {i+1}/{max_retries})")
            time.sleep(2)
    return False

def find_rn_web_buttons(page: Page):
    """Find React Native Web button-like elements"""
    # RN Web uses role="button" or Pressable components
    selectors = [
        '[role="button"]',
        '[data-focusable="true"]',
        '[tabindex="0"]',
        'div[class*="Pressable"]',
        'div[class*="pressable"]',
        'div[class*="Button"]',
        'div[class*="button"]',
        'div[class*="TouchableOpacity"]',
        'div[class*="Touchable"]',
    ]

    all_buttons = []
    for selector in selectors:
        elements = page.locator(selector).all()
        for el in elements:
            try:
                text = el.inner_text().strip()
                if text and el not in all_buttons:
                    all_buttons.append((el, text, selector))
            except:
                pass

    return all_buttons

def login_rn_web(page: Page):
    """Login on React Native Web app"""
    print("\n🔐 Logging in (React Native Web)...")

    if not wait_for_server(page):
        print("❌ Server not responding")
        return False

    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(2000)

    take_screenshot(page, "rn_01_initial")

    # Find inputs
    email_input = page.locator('input[type="email"]').first
    password_input = page.locator('input[type="password"]').first

    if email_input.count() == 0 or password_input.count() == 0:
        print("❌ Could not find login inputs")
        return False

    # Fill credentials
    print("  Filling credentials...")
    email_input.fill(CREDENTIALS["email"])
    page.wait_for_timeout(300)
    password_input.fill(CREDENTIALS["password"])
    page.wait_for_timeout(300)

    take_screenshot(page, "rn_02_filled")

    # Find all clickable elements that look like buttons
    print("\n  Looking for RN Web button elements...")
    buttons = find_rn_web_buttons(page)
    print(f"  Found {len(buttons)} potential buttons:")
    for el, text, selector in buttons[:10]:
        print(f"    - '{text[:30]}' ({selector})")

    # Look specifically for login-related buttons
    login_keywords = ['כניסה', 'התחבר', 'login', 'sign in', 'enter', 'submit', 'הכנס']

    login_button = None
    for el, text, selector in buttons:
        text_lower = text.lower()
        for keyword in login_keywords:
            if keyword.lower() in text_lower:
                login_button = el
                print(f"  ✓ Found login button: '{text}'")
                break
        if login_button:
            break

    # If no login button found, try the last clickable element (often the submit button is last)
    if not login_button and buttons:
        login_button = buttons[-1][0]
        print(f"  ℹ️ Using last button: '{buttons[-1][1]}'")

    if login_button:
        print("\n  Clicking login button...")
        try:
            login_button.click()
        except:
            # Try force click
            login_button.click(force=True)

        page.wait_for_timeout(5000)
        take_screenshot(page, "rn_03_after_click")

        # Check if login succeeded
        if page.locator('input[type="password"]').count() == 0:
            print("  ✅ Login successful!")
            return True
        else:
            print("  ⚠️ Still on login page, trying Enter key...")

    # Try Enter key as fallback
    password_input.press('Enter')
    page.wait_for_timeout(5000)
    take_screenshot(page, "rn_04_after_enter")

    if page.locator('input[type="password"]').count() == 0:
        print("  ✅ Login successful via Enter!")
        return True

    # Check page content
    print("\n  Analyzing current page...")
    content = page.content()
    if 'error' in content.lower() or 'שגיאה' in content:
        print("  ⚠️ Possible error on page")

    return False

def test_authenticated_app(page: Page):
    """Test the authenticated app"""
    print("\n🧪 Testing Authenticated App...")

    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(2000)

    take_screenshot(page, "rn_10_authenticated")

    # Find key elements
    print("\n  Page elements:")

    # Navigation
    nav_count = page.locator('nav, [role="navigation"]').count()
    print(f"    Navigation: {nav_count}")

    # Buttons in authenticated app
    buttons = find_rn_web_buttons(page)
    print(f"    Buttons: {len(buttons)}")
    for el, text, selector in buttons[:5]:
        print(f"      - '{text[:40]}'")

    # Avatar/Wizard elements
    avatar_selectors = [
        '[class*="avatar" i]',
        '[class*="wizard" i]',
        'img[src*="wizard"]',
        'img[alt*="wizard"]',
    ]
    for selector in avatar_selectors:
        count = page.locator(selector).count()
        if count > 0:
            print(f"    Avatar ({selector}): {count}")

    # Voice elements
    voice_selectors = [
        '[class*="voice" i]',
        '[class*="mic" i]',
        '[aria-label*="voice" i]',
    ]
    for selector in voice_selectors:
        count = page.locator(selector).count()
        if count > 0:
            print(f"    Voice ({selector}): {count}")

    # Support elements
    support_selectors = [
        '[class*="support" i]',
        '[class*="help" i]',
        '[aria-label*="support" i]',
    ]
    for selector in support_selectors:
        count = page.locator(selector).count()
        if count > 0:
            print(f"    Support ({selector}): {count}")

    # Take responsive screenshots
    print("\n  Testing responsive layouts...")
    viewports = [
        ("mobile", 375, 812),
        ("tablet", 768, 1024),
        ("desktop", 1920, 1080),
    ]

    for name, width, height in viewports:
        page.set_viewport_size({"width": width, "height": height})
        page.wait_for_timeout(500)
        take_screenshot(page, f"rn_responsive_{name}")
        print(f"    ✓ {name} ({width}x{height})")

    return True

def run_tests():
    ensure_screenshot_dir()

    print("=" * 60)
    print("🚀 Bayit+ E2E Tests (React Native Web)")
    print("=" * 60)
    print(f"📁 Screenshots: {SCREENSHOT_DIR}")
    print(f"🌐 URL: {BASE_URL}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            locale='he-IL',
        )
        page = context.new_page()

        # Suppress noisy console warnings
        page.on('console', lambda msg: None)

        # Login
        login_success = login_rn_web(page)

        if login_success:
            # Test authenticated features
            test_authenticated_app(page)
            print("\n✅ All tests completed!")
        else:
            print("\n❌ Login failed - cannot test authenticated features")

        browser.close()

    return login_success

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
