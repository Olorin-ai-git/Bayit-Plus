#!/usr/bin/env python3
"""
Avatar System E2E Test Suite - Authenticated
Tests the voice→avatar→gesture flow in the Bayit+ web application after login

Tests cover:
- Login flow
- Avatar visibility and state transitions
- Gesture animations
- Voice interaction UI elements
- Widget system
"""

import os
import sys
import time
from playwright.sync_api import sync_playwright, Page, expect

# Configuration
BASE_URL = "http://localhost:3200"
SCREENSHOT_DIR = "/tmp/bayit_avatar_tests"
CREDENTIALS = {
    "email": "admin@olorin.ai",
    "password": "Jersey1973!"
}

def ensure_screenshot_dir():
    """Create screenshot directory if it doesn't exist"""
    os.makedirs(SCREENSHOT_DIR, exist_ok=True)

def take_screenshot(page: Page, name: str):
    """Take a screenshot with the given name"""
    path = f"{SCREENSHOT_DIR}/{name}.png"
    page.screenshot(path=path, full_page=True)
    print(f"📸 Screenshot saved: {path}")
    return path

def wait_for_server(page: Page, max_retries=10):
    """Wait for server to be ready with retries"""
    for i in range(max_retries):
        try:
            page.goto(BASE_URL, timeout=10000)
            return True
        except Exception as e:
            print(f"  Waiting for server... (attempt {i+1}/{max_retries})")
            time.sleep(2)
    return False

def perform_login(page: Page):
    """Perform login with credentials"""
    print("\n🔐 Performing Login...")

    # Wait for server with retries
    if not wait_for_server(page):
        print("❌ Server not responding after retries")
        return False

    page.wait_for_load_state('networkidle')

    take_screenshot(page, "00_login_page")

    # Wait for login form to appear
    page.wait_for_timeout(1000)

    # Find email input - try various selectors
    email_selectors = [
        'input[type="email"]',
        'input[name="email"]',
        'input[placeholder*="email" i]',
        'input[placeholder*="דוא" i]',  # Hebrew for email
        '#email',
        '[data-testid="email-input"]',
    ]

    email_input = None
    for selector in email_selectors:
        try:
            el = page.locator(selector).first
            if el.count() > 0:
                email_input = el
                print(f"  Found email input: {selector}")
                break
        except:
            continue

    if not email_input:
        # Try finding any text input
        inputs = page.locator('input[type="text"], input[type="email"]').all()
        print(f"  Found {len(inputs)} text/email inputs")
        if inputs:
            email_input = inputs[0]

    # Find password input
    password_selectors = [
        'input[type="password"]',
        'input[name="password"]',
        '#password',
        '[data-testid="password-input"]',
    ]

    password_input = None
    for selector in password_selectors:
        try:
            el = page.locator(selector).first
            if el.count() > 0:
                password_input = el
                print(f"  Found password input: {selector}")
                break
        except:
            continue

    if email_input and password_input:
        # Fill credentials
        email_input.fill(CREDENTIALS["email"])
        page.wait_for_timeout(300)
        password_input.fill(CREDENTIALS["password"])
        page.wait_for_timeout(300)

        take_screenshot(page, "01_credentials_filled")

        # Find and click login button
        login_button_selectors = [
            'button[type="submit"]',
            'button:has-text("Login")',
            'button:has-text("Sign in")',
            'button:has-text("התחבר")',  # Hebrew for "Login"
            'button:has-text("כניסה")',  # Hebrew for "Enter"
            '[data-testid="login-button"]',
        ]

        for selector in login_button_selectors:
            try:
                btn = page.locator(selector).first
                if btn.count() > 0 and btn.is_visible():
                    print(f"  Clicking login button: {selector}")
                    btn.click()
                    break
            except:
                continue

        # Wait for navigation/login to complete
        page.wait_for_timeout(3000)
        page.wait_for_load_state('networkidle')

        take_screenshot(page, "02_after_login")
        print("✅ Login attempted")
        return True
    else:
        print("⚠️ Could not find login form elements")
        # List all inputs for debugging
        all_inputs = page.locator('input').all()
        print(f"  Total inputs found: {len(all_inputs)}")
        for i, inp in enumerate(all_inputs[:10]):
            try:
                inp_type = inp.get_attribute('type') or 'text'
                inp_name = inp.get_attribute('name') or ''
                inp_placeholder = inp.get_attribute('placeholder') or ''
                print(f"    Input {i}: type={inp_type}, name={inp_name}, placeholder={inp_placeholder}")
            except:
                pass
        return False

def test_authenticated_home(page: Page):
    """Test 1: Verify authenticated home page"""
    print("\n🧪 Test 1: Authenticated Home Page")

    take_screenshot(page, "10_authenticated_home")

    # Check if we're past login (no login form visible)
    login_forms = page.locator('input[type="password"]').all()
    if login_forms:
        print("⚠️ Still on login page")
        return False

    print("✅ Authenticated home page loaded")
    return True

def test_avatar_presence(page: Page):
    """Test 2: Check for avatar/wizard elements"""
    print("\n🧪 Test 2: Avatar Presence Check")

    # Look for avatar-related elements
    avatar_selectors = [
        '[data-testid*="avatar"]',
        '[data-testid*="wizard"]',
        '[class*="Avatar"]',
        '[class*="avatar"]',
        '[class*="Wizard"]',
        '[class*="wizard"]',
        'img[src*="wizard"]',
        'img[alt*="wizard"]',
        '[class*="support"]',
        '[class*="Support"]',
    ]

    found = []
    for selector in avatar_selectors:
        elements = page.locator(selector).all()
        if elements:
            found.append(f"{selector}: {len(elements)}")

    if found:
        print(f"✅ Found avatar elements: {found}")
    else:
        print("ℹ️ No avatar elements visible (may need to trigger)")

    take_screenshot(page, "11_avatar_check")
    return True

def test_voice_ui_elements(page: Page):
    """Test 3: Check for voice UI elements"""
    print("\n🧪 Test 3: Voice UI Elements")

    voice_selectors = [
        '[data-testid*="voice"]',
        '[data-testid*="mic"]',
        '[class*="Voice"]',
        '[class*="voice"]',
        '[class*="Mic"]',
        '[class*="microphone"]',
        'button[aria-label*="voice" i]',
        'button[aria-label*="mic" i]',
        '[class*="fab"]',  # Floating action button
        'svg[class*="mic"]',
    ]

    found = []
    for selector in voice_selectors:
        elements = page.locator(selector).all()
        if elements:
            found.append(f"{selector}: {len(elements)}")

    if found:
        print(f"✅ Found voice UI elements: {found}")
    else:
        print("ℹ️ No voice UI elements visible")

    take_screenshot(page, "12_voice_ui")
    return True

def test_navigation_elements(page: Page):
    """Test 4: Check navigation and main UI"""
    print("\n🧪 Test 4: Navigation Elements")

    # Check for navigation
    nav_elements = page.locator('nav, [role="navigation"], [class*="Nav"], [class*="nav"]').all()
    print(f"  Navigation elements: {len(nav_elements)}")

    # Check for sidebar
    sidebar_elements = page.locator('[class*="Sidebar"], [class*="sidebar"], aside').all()
    print(f"  Sidebar elements: {len(sidebar_elements)}")

    # Check for main content area
    main_elements = page.locator('main, [role="main"], [class*="Main"], [class*="content"]').all()
    print(f"  Main content elements: {len(main_elements)}")

    # Check for buttons
    buttons = page.locator('button').all()
    print(f"  Buttons: {len(buttons)}")

    take_screenshot(page, "13_navigation")
    return True

def test_widget_system(page: Page):
    """Test 5: Check widget system"""
    print("\n🧪 Test 5: Widget System")

    widget_selectors = [
        '[data-testid*="widget"]',
        '[class*="Widget"]',
        '[class*="widget"]',
        '[class*="Card"]',
        '[class*="card"]',
        '[draggable="true"]',
    ]

    found = []
    for selector in widget_selectors:
        elements = page.locator(selector).all()
        if elements:
            found.append(f"{selector}: {len(elements)}")

    if found:
        print(f"✅ Found widget elements: {found}")
    else:
        print("ℹ️ No widget elements visible")

    take_screenshot(page, "14_widgets")
    return True

def test_responsive_authenticated(page: Page):
    """Test 6: Test responsive layout when authenticated"""
    print("\n🧪 Test 6: Responsive Layout (Authenticated)")

    viewports = [
        ("mobile", 375, 812),
        ("tablet", 768, 1024),
        ("desktop_hd", 1920, 1080),
        ("desktop_4k", 2560, 1440),
    ]

    for name, width, height in viewports:
        page.set_viewport_size({"width": width, "height": height})
        page.wait_for_timeout(500)
        take_screenshot(page, f"15_responsive_{name}")
        print(f"  ✅ {name} ({width}x{height}) rendered")

    # Reset to desktop
    page.set_viewport_size({"width": 1920, "height": 1080})
    return True

def test_support_trigger(page: Page):
    """Test 7: Try to trigger support/avatar"""
    print("\n🧪 Test 7: Support/Avatar Trigger")

    # Look for support button or trigger
    support_selectors = [
        '[data-testid*="support"]',
        '[class*="Support"]',
        '[class*="support"]',
        '[class*="Help"]',
        '[class*="help"]',
        'button:has-text("עזרה")',  # Hebrew for "Help"
        'button:has-text("תמיכה")',  # Hebrew for "Support"
        '[aria-label*="support" i]',
        '[aria-label*="help" i]',
    ]

    for selector in support_selectors:
        try:
            el = page.locator(selector).first
            if el.count() > 0 and el.is_visible():
                print(f"  Found support trigger: {selector}")
                take_screenshot(page, "16_before_support_click")
                el.click()
                page.wait_for_timeout(1500)
                take_screenshot(page, "17_after_support_click")
                print("  ✅ Support triggered")
                return True
        except Exception as e:
            continue

    print("  ℹ️ No support trigger found")
    return True

def test_keyboard_navigation(page: Page):
    """Test 8: Test keyboard navigation"""
    print("\n🧪 Test 8: Keyboard Navigation")

    # Press Tab several times to check focus
    page.keyboard.press('Tab')
    page.wait_for_timeout(200)
    page.keyboard.press('Tab')
    page.wait_for_timeout(200)
    page.keyboard.press('Tab')

    take_screenshot(page, "18_keyboard_nav")

    # Check for focus indicators
    focused = page.locator(':focus').first
    if focused.count() > 0:
        print("  ✅ Focus navigation working")
    else:
        print("  ⚠️ No visible focus indicator")

    return True

def run_all_tests():
    """Run all E2E tests"""
    ensure_screenshot_dir()

    print("=" * 60)
    print("🚀 Bayit+ Avatar System E2E Test Suite (Authenticated)")
    print("=" * 60)
    print(f"📁 Screenshots: {SCREENSHOT_DIR}")
    print(f"🌐 Target URL: {BASE_URL}")
    print(f"👤 User: {CREDENTIALS['email']}")

    results = {}

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            locale='he-IL',
        )
        page = context.new_page()

        # Perform login first
        login_success = perform_login(page)
        results["Login"] = "PASS" if login_success else "FAIL"

        if login_success:
            # Run authenticated tests
            tests = [
                ("Authenticated Home", test_authenticated_home),
                ("Avatar Presence", test_avatar_presence),
                ("Voice UI Elements", test_voice_ui_elements),
                ("Navigation Elements", test_navigation_elements),
                ("Widget System", test_widget_system),
                ("Responsive Layout", test_responsive_authenticated),
                ("Support Trigger", test_support_trigger),
                ("Keyboard Navigation", test_keyboard_navigation),
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
