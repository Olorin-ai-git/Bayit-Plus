"""E2E tests for Connected Sources UI."""
import os
import pytest
from playwright.sync_api import Page, expect

pytestmark = [pytest.mark.e2e, pytest.mark.google_api]

TRAINING_URL = os.environ.get("TRAINING_PORTAL_URL", "http://localhost:5173")


@pytest.fixture
def admin_page(page: Page):
    """Login as test admin."""
    page.goto(f"{TRAINING_URL}/login")
    page.fill('[data-testid="email-input"]', os.environ.get("TEST_ADMIN_EMAIL", ""))
    page.fill('[data-testid="password-input"]', os.environ.get("TEST_ADMIN_PASSWORD", ""))
    page.click('[data-testid="login-button"]')
    page.wait_for_url("**/admin**")
    return page


def test_connected_sources_page_loads(admin_page: Page):
    admin_page.goto(f"{TRAINING_URL}/admin/sources")
    expect(admin_page.locator("h1")).to_contain_text("Connected Sources")


def test_connect_google_button_visible(admin_page: Page):
    admin_page.goto(f"{TRAINING_URL}/admin/sources")
    expect(
        admin_page.locator('[data-testid="connect-google"]')
    ).to_be_visible()


def test_connect_google_opens_oauth(admin_page: Page):
    admin_page.goto(f"{TRAINING_URL}/admin/sources")
    with admin_page.expect_popup() as popup_info:
        admin_page.click('[data-testid="connect-google"]')
    popup = popup_info.value
    expect(popup).to_have_url(lambda url: "accounts.google.com" in url)
    popup.close()
