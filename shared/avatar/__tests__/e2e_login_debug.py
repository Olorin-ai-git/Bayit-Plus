#!/usr/bin/env python3
"""
Login Debug Script - Find and interact with login form
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

def debug_login(page: Page):
    """Debug the login form and attempt login"""
    print("\n🔍 Debugging Login Form...")

    if not wait_for_server(page):
        print("❌ Server not responding")
        return False

    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(2000)  # Extra wait for React hydration

    take_screenshot(page, "debug_01_initial")

    # List ALL elements on the page
    print("\n📋 Form Elements Analysis:")

    # Find all inputs
    inputs = page.locator('input').all()
    print(f"\n  Found {len(inputs)} input elements:")
    for i, inp in enumerate(inputs):
        try:
            attrs = {
                'type': inp.get_attribute('type'),
                'name': inp.get_attribute('name'),
                'id': inp.get_attribute('id'),
                'placeholder': inp.get_attribute('placeholder'),
                'class': inp.get_attribute('class')[:50] if inp.get_attribute('class') else None,
            }
            print(f"    [{i}] {attrs}")
        except Exception as e:
            print(f"    [{i}] Error: {e}")

    # Find all buttons
    buttons = page.locator('button').all()
    print(f"\n  Found {len(buttons)} button elements:")
    for i, btn in enumerate(buttons):
        try:
            attrs = {
                'type': btn.get_attribute('type'),
                'text': btn.inner_text()[:30] if btn.inner_text() else None,
                'class': btn.get_attribute('class')[:50] if btn.get_attribute('class') else None,
                'disabled': btn.get_attribute('disabled'),
            }
            print(f"    [{i}] {attrs}")
        except Exception as e:
            print(f"    [{i}] Error: {e}")

    # Find clickable elements with specific text
    print("\n  Looking for login-related elements:")
    login_texts = ['login', 'sign in', 'כניסה', 'התחבר', 'enter', 'submit']
    for text in login_texts:
        elements = page.locator(f'button:has-text("{text}"), a:has-text("{text}"), [role="button"]:has-text("{text}")').all()
        if elements:
            print(f"    Found {len(elements)} elements with text '{text}'")

    # Try to find the form
    forms = page.locator('form').all()
    print(f"\n  Found {len(forms)} form elements")

    # Now try to fill and submit
    print("\n🔐 Attempting Login...")

    # Find email input
    email_input = page.locator('input[type="email"]').first
    if email_input.count() == 0:
        email_input = page.locator('input').first

    # Find password input
    password_input = page.locator('input[type="password"]').first

    if email_input.count() > 0 and password_input.count() > 0:
        print("  ✓ Found email and password inputs")

        # Clear and fill
        email_input.click()
        email_input.fill('')
        email_input.fill(CREDENTIALS["email"])
        print(f"  ✓ Filled email: {CREDENTIALS['email']}")

        password_input.click()
        password_input.fill('')
        password_input.fill(CREDENTIALS["password"])
        print("  ✓ Filled password")

        take_screenshot(page, "debug_02_filled")

        # Try multiple ways to submit
        print("\n  Trying submission methods:")

        # Method 1: Press Enter in password field
        print("    Method 1: Press Enter...")
        password_input.press('Enter')
        page.wait_for_timeout(3000)
        take_screenshot(page, "debug_03_after_enter")

        # Check if we're still on login
        if page.locator('input[type="password"]').count() == 0:
            print("  ✅ Login successful via Enter key!")
            return True

        # Method 2: Click submit button by type
        print("    Method 2: Click button[type=submit]...")
        submit_btn = page.locator('button[type="submit"]').first
        if submit_btn.count() > 0:
            submit_btn.click()
            page.wait_for_timeout(3000)
            take_screenshot(page, "debug_04_after_submit_btn")

            if page.locator('input[type="password"]').count() == 0:
                print("  ✅ Login successful via submit button!")
                return True

        # Method 3: Click any visible button
        print("    Method 3: Click first visible button...")
        all_buttons = page.locator('button:visible').all()
        for btn in all_buttons:
            try:
                btn_text = btn.inner_text()
                print(f"      Clicking button: '{btn_text}'")
                btn.click()
                page.wait_for_timeout(3000)
                take_screenshot(page, "debug_05_after_btn_click")

                if page.locator('input[type="password"]').count() == 0:
                    print("  ✅ Login successful!")
                    return True
                break
            except:
                continue

        # Method 4: Form submit
        print("    Method 4: Form submit...")
        form = page.locator('form').first
        if form.count() > 0:
            form.evaluate('form => form.submit()')
            page.wait_for_timeout(3000)
            take_screenshot(page, "debug_06_after_form_submit")

            if page.locator('input[type="password"]').count() == 0:
                print("  ✅ Login successful via form submit!")
                return True

    # Check for error messages
    print("\n  Checking for error messages...")
    error_selectors = [
        '[class*="error"]',
        '[class*="Error"]',
        '[role="alert"]',
        '.toast',
        '[class*="toast"]',
    ]
    for selector in error_selectors:
        errors = page.locator(selector).all()
        if errors:
            for err in errors:
                try:
                    text = err.inner_text()
                    if text:
                        print(f"    ⚠️ Error found: {text[:100]}")
                except:
                    pass

    take_screenshot(page, "debug_07_final")
    print("\n❌ Login did not succeed")
    return False

def run_debug():
    ensure_screenshot_dir()

    print("=" * 60)
    print("🔍 Bayit+ Login Debug Script")
    print("=" * 60)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            locale='he-IL',
        )
        page = context.new_page()

        # Enable console logging
        page.on('console', lambda msg: print(f"    [Console {msg.type}] {msg.text[:100]}") if msg.type in ['error', 'warning'] else None)

        success = debug_login(page)

        if success:
            print("\n✅ Successfully logged in!")
            take_screenshot(page, "debug_success_home")

            # Wait and explore the authenticated page
            page.wait_for_load_state('networkidle')
            page.wait_for_timeout(2000)

            # Take final screenshot
            take_screenshot(page, "debug_authenticated_page")

            # List main elements
            print("\n📋 Authenticated Page Elements:")
            for selector in ['nav', 'aside', 'main', 'button', '[class*="avatar"]', '[class*="voice"]']:
                count = page.locator(selector).count()
                if count > 0:
                    print(f"    {selector}: {count} elements")

        browser.close()

    return success

if __name__ == "__main__":
    success = run_debug()
    sys.exit(0 if success else 1)
