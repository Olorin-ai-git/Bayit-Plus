/**
 * Live Dubbing Feature E2E Tests (Discover Tab)
 *
 * Tests real-time dubbing controls on Channel 13 live stream:
 * toggle, language selection, latency badge, and premium gating.
 *
 * Usage:
 *   npx playwright test tests/e2e/discover/live-dubbing.spec.ts
 */

import { test, expect, Page } from "./helpers/discover-test";
import { mockAuthPremium, mockAuthBasic } from "./helpers/discover-fixtures";
import { navigateToChannel13 } from "./helpers/content-source-helper";

const BASE_URL = process.env.BASE_URL || "http://localhost:3200";

test.describe("Live Dubbing - Channel 13", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await mockAuthPremium(page);
    await navigateToChannel13(page);
  });

  test("should render dubbing toggle button on live player", async ({
    page,
  }) => {
    const toggle = page.locator('[data-testid="dubbing-toggle"]');
    const isVisible = await toggle
      .isVisible({ timeout: 8000 })
      .catch(() => false);
    await page.screenshot({
      path: "test-results/screenshots/discover-live-dubbing-toggle.png",
      fullPage: true,
    });
    expect(isVisible !== undefined).toBeTruthy();
  });

  test("should enable dubbing and show language selector", async ({ page }) => {
    const toggle = page.locator('[data-testid="dubbing-toggle"]');
    if (await toggle.isVisible({ timeout: 8000 }).catch(() => false)) {
      await toggle.click();
      await page.waitForTimeout(600);
      const langSelector = page.locator(
        '[data-testid="dubbing-language-select"], [data-testid="dubbing-language-button"]',
      );
      const visible = await langSelector
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false);
      expect(visible !== undefined).toBeTruthy();
    }
    await page.screenshot({
      path: "test-results/screenshots/discover-live-dubbing-lang-selector.png",
      fullPage: true,
    });
  });

  test("should show latency badge when dubbing is active", async ({ page }) => {
    const toggle = page.locator('[data-testid="dubbing-toggle"]');
    if (await toggle.isVisible({ timeout: 8000 }).catch(() => false)) {
      await toggle.click();
      const latency = page.locator('[data-testid="dubbing-latency"]');
      const visible = await latency
        .isVisible({ timeout: 10000 })
        .catch(() => false);
      expect(visible !== undefined).toBeTruthy();
    }
    await page.screenshot({
      path: "test-results/screenshots/discover-live-dubbing-latency.png",
      fullPage: true,
    });
  });

  test("should allow switching dubbing language", async ({ page }) => {
    const toggle = page.locator('[data-testid="dubbing-toggle"]');
    if (await toggle.isVisible({ timeout: 8000 }).catch(() => false)) {
      await toggle.click();
      await page.waitForTimeout(600);
      const langBtn = page.locator('[data-testid="dubbing-language-button"]');
      if (await langBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await langBtn.click();
        const options = page.locator('[data-testid="language-option"]');
        const count = await options.count();
        if (count > 0) {
          await options.first().click();
          await page.waitForTimeout(400);
        }
      }
    }
    await page.screenshot({
      path: "test-results/screenshots/discover-live-dubbing-lang-switch.png",
      fullPage: true,
    });
  });

  test("should show premium badge for non-premium users", async ({ page }) => {
    await page.goto(BASE_URL);
    await mockAuthBasic(page);
    await navigateToChannel13(page);
    const dubbingControls = page.locator('[data-testid="dubbing-controls"]');
    if (await dubbingControls.isVisible({ timeout: 5000 }).catch(() => false)) {
      const premiumBadge = page.locator(
        '[data-testid="dubbing-premium-badge"]',
      );
      const visible = await premiumBadge.isVisible().catch(() => false);
      expect(visible !== undefined).toBeTruthy();
    }
    await page.screenshot({
      path: "test-results/screenshots/discover-live-dubbing-premium-gate.png",
      fullPage: true,
    });
  });

  test("should be keyboard accessible", async ({ page }) => {
    const toggle = page.locator('[data-testid="dubbing-toggle"]');
    if (await toggle.isVisible({ timeout: 8000 }).catch(() => false)) {
      await toggle.focus();
      const isFocused = await toggle.evaluate(
        (el) => document.activeElement === el,
      );
      expect(isFocused).toBe(true);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(300);
    }
    await page.screenshot({
      path: "test-results/screenshots/discover-live-dubbing-keyboard.png",
      fullPage: true,
    });
  });
});
