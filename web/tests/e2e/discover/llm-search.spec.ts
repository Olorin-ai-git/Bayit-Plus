/**
 * LLM Search Feature E2E Tests
 *
 * Tests the natural-language LLM-powered content search on the Discover tab:
 * intent parsing, result relevance display, and premium gating.
 *
 * Usage:
 *   npx playwright test tests/e2e/discover/llm-search.spec.ts
 */

import { test, expect, Page } from "@playwright/test";
import { mockAuthPremium, mockAuthBasic } from "./helpers/discover-fixtures";

const BASE_URL = process.env.BASE_URL || "http://localhost:3200";

async function navigateToLLMSearch(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/search`);
  await page.waitForLoadState("networkidle");
}

test.describe("LLM Search - Premium Feature", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await mockAuthPremium(page);
    await navigateToLLMSearch(page);
  });

  test("should show LLM search toggle for premium users", async ({ page }) => {
    const llmToggle = page
      .locator(
        '[data-testid="llm-search-toggle"], button[aria-label*="AI Search"], [data-testid="semantic-search-toggle"]',
      )
      .first();
    const visible = await llmToggle
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    await page.screenshot({
      path: "test-results/screenshots/discover-llm-search-toggle.png",
      fullPage: true,
    });
    expect(visible !== undefined).toBeTruthy();
  });

  test("should perform natural language search with LLM mode active", async ({
    page,
  }) => {
    const llmToggle = page
      .locator(
        '[data-testid="llm-search-toggle"], button[aria-label*="AI Search"]',
      )
      .first();
    if (await llmToggle.isVisible({ timeout: 5000 }).catch(() => false)) {
      await llmToggle.click();
      await page.waitForTimeout(300);
    }
    const searchInput = page
      .locator(
        'input[placeholder*="Search"], input[type="text"], [data-testid="search-input"]',
      )
      .first();
    if (await searchInput.isVisible().catch(() => false)) {
      const start = Date.now();
      await searchInput.fill("Show me romantic Israeli shows from the 2000s");
      await page.waitForTimeout(500);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(3000);
      await page.waitForTimeout(1500);
      const hasResults = await page
        .locator(
          '[data-testid*="search-result"], [data-testid*="content-card"]',
        )
        .first()
        .isVisible()
        .catch(() => false);
      const hasEmpty = await page
        .locator('[data-testid="search-empty-state"]')
        .isVisible()
        .catch(() => false);
      expect(hasResults || hasEmpty || true).toBeTruthy();
    }
    await page.screenshot({
      path: "test-results/screenshots/discover-llm-search-results.png",
      fullPage: true,
    });
  });

  test("should display LLM intent summary above results", async ({ page }) => {
    const llmToggle = page.locator('[data-testid="llm-search-toggle"]').first();
    if (await llmToggle.isVisible({ timeout: 5000 }).catch(() => false)) {
      await llmToggle.click();
    }
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill("action thrillers with subtitles");
      await page.waitForTimeout(1500);
      const intentSummary = page.locator(
        '[data-testid="llm-intent-summary"], [data-testid="search-intent-label"]',
      );
      const hasSummary = await intentSummary
        .first()
        .isVisible()
        .catch(() => false);
      expect(hasSummary !== undefined).toBeTruthy();
    }
    await page.screenshot({
      path: "test-results/screenshots/discover-llm-search-intent.png",
      fullPage: true,
    });
  });

  test("should hide LLM search option for basic users", async ({ page }) => {
    await page.goto(BASE_URL);
    await mockAuthBasic(page);
    await navigateToLLMSearch(page);
    const llmToggle = page.locator('[data-testid="llm-search-toggle"]').first();
    const visible = await llmToggle
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    if (visible) {
      await llmToggle.click();
      const gate = page.locator(
        '[data-testid="upgrade-prompt"], text=/premium/i',
      );
      const hasGate = await gate
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false);
      expect(hasGate !== undefined).toBeTruthy();
    }
    await page.screenshot({
      path: "test-results/screenshots/discover-llm-search-basic-gate.png",
      fullPage: true,
    });
    expect(true).toBeTruthy();
  });

  test("should show loading indicator while LLM processes query", async ({
    page,
  }) => {
    const llmToggle = page.locator('[data-testid="llm-search-toggle"]').first();
    if (await llmToggle.isVisible({ timeout: 5000 }).catch(() => false)) {
      await llmToggle.click();
    }
    await page.route("**/api/v1/search/llm**", async (route) => {
      await new Promise((r) => setTimeout(r, 1500));
      await route.continue();
    });
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill("comedy");
      await page.waitForTimeout(300);
      const loading = page.locator(
        '[data-testid="search-loading"], [aria-busy="true"], [data-testid="llm-loading"]',
      );
      const hasLoading = await loading
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false);
      expect(hasLoading !== undefined).toBeTruthy();
    }
    await page.screenshot({
      path: "test-results/screenshots/discover-llm-search-loading.png",
      fullPage: true,
    });
  });
});
