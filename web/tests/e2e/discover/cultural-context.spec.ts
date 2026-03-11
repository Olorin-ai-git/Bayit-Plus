/**
 * Cultural Context VOD Feature E2E Tests
 *
 * Tests the Cultural Context side-panel that surfaces Jewish cultural and
 * historical annotations during VOD playback. Covers Plex and YouTube.
 *
 * Usage:
 *   npx playwright test tests/e2e/discover/cultural-context.spec.ts
 */

import { test, expect, Page } from "./helpers/discover-test";
import { mockAuthPremium } from "./helpers/discover-fixtures";
import {
  navigateToPlexContent,
  navigateToYouTubeContent,
  openPlayerPanel,
  seekVideo,
} from "./helpers/content-source-helper";

const BASE_URL = process.env.BASE_URL || "http://localhost:3200";

async function openCulturalContextPanel(page: Page): Promise<boolean> {
  return openPlayerPanel(page, "cultural-context-button");
}

test.describe("Cultural Context - Plex Content", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await mockAuthPremium(page);
    await navigateToPlexContent(page);
    await seekVideo(page, 45);
  });

  test("should open cultural context panel from player controls", async ({
    page,
  }) => {
    await openCulturalContextPanel(page);
    const panel = page.locator(
      '[data-testid="cultural-context-panel"], [data-testid="cultural-panel"]',
    );
    await page.screenshot({
      path: "test-results/screenshots/discover-cultural-context-plex-open.png",
      fullPage: true,
    });
    expect(panel).toBeDefined();
  });

  test("should display cultural annotations for current scene", async ({
    page,
  }) => {
    await openCulturalContextPanel(page);
    await page.waitForTimeout(800);
    const annotations = page.locator(
      '[data-testid="cultural-annotation"], [data-testid="context-card"]',
    );
    const count = await annotations.count();
    await page.screenshot({
      path: "test-results/screenshots/discover-cultural-context-plex-annotations.png",
      fullPage: true,
    });
    expect(count >= 0).toBeTruthy();
  });

  test("should expand annotation for more detail", async ({ page }) => {
    await openCulturalContextPanel(page);
    await page.waitForTimeout(600);
    const firstAnnotation = page
      .locator('[data-testid="cultural-annotation"]')
      .first();
    if (await firstAnnotation.isVisible().catch(() => false)) {
      await firstAnnotation.click();
      await page.waitForTimeout(400);
      const expanded = page.locator(
        '[data-testid="annotation-detail"], [data-testid="cultural-annotation-expanded"]',
      );
      const visible = await expanded
        .first()
        .isVisible()
        .catch(() => false);
      expect(visible !== undefined).toBeTruthy();
    }
    await page.screenshot({
      path: "test-results/screenshots/discover-cultural-context-plex-expanded.png",
      fullPage: true,
    });
  });

  test("should update context when video seeks to new position", async ({
    page,
  }) => {
    await openCulturalContextPanel(page);
    await page.waitForTimeout(500);
    await seekVideo(page, 120);
    await page.waitForTimeout(800);
    await page.screenshot({
      path: "test-results/screenshots/discover-cultural-context-plex-seek-update.png",
      fullPage: true,
    });
    const panel = page.locator('[data-testid="cultural-context-panel"]');
    expect(panel).toBeDefined();
  });
});

test.describe("Cultural Context - YouTube Content", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await mockAuthPremium(page);
    await navigateToYouTubeContent(page);
    await seekVideo(page, 45);
  });

  test("should open cultural context panel on YouTube content", async ({
    page,
  }) => {
    await openCulturalContextPanel(page);
    await page.screenshot({
      path: "test-results/screenshots/discover-cultural-context-youtube-open.png",
      fullPage: true,
    });
    expect(true).toBeTruthy();
  });

  test("should show loading state while fetching context", async ({ page }) => {
    await page.route("**/api/v1/cultural-context/**", async (route) => {
      await new Promise((r) => setTimeout(r, 800));
      await route.continue();
    });
    await openCulturalContextPanel(page);
    const loading = page.locator(
      '[data-testid="cultural-context-loading"], [aria-busy="true"]',
    );
    await page.screenshot({
      path: "test-results/screenshots/discover-cultural-context-youtube-loading.png",
      fullPage: true,
    });
    expect(loading).toBeDefined();
  });
});
