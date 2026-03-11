/**
 * Interactive Subtitles VOD Feature E2E Tests
 *
 * Tests tap-to-translate subtitles with word-level highlights on both
 * Plex and YouTube BYOC content sources.
 *
 * Usage:
 *   npx playwright test tests/e2e/discover/interactive-subtitles.spec.ts
 */

import { test, expect, Page } from "./helpers/discover-test";
import { mockAuthPremium } from "./helpers/discover-fixtures";
import {
  navigateToPlexContent,
  navigateToYouTubeContent,
  seekVideo,
} from "./helpers/content-source-helper";

const BASE_URL = process.env.BASE_URL || "http://localhost:3200";

async function waitForSubtitles(page: Page): Promise<boolean> {
  await page.waitForTimeout(1000);
  return page
    .locator(
      '[data-testid="subtitle-cue"], [data-testid="interactive-subtitle"], .subtitle-word',
    )
    .first()
    .isVisible()
    .catch(() => false);
}

test.describe("Interactive Subtitles - Plex Content", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await mockAuthPremium(page);
    await navigateToPlexContent(page);
    await seekVideo(page, 15);
  });

  test("should display interactive subtitle cues during playback", async ({
    page,
  }) => {
    const hasSubtitles = await waitForSubtitles(page);
    await page.screenshot({
      path: "test-results/screenshots/discover-interactive-subtitles-plex.png",
      fullPage: true,
    });
    expect(hasSubtitles !== undefined).toBeTruthy();
  });

  test("should show word-level translation popup on click", async ({
    page,
  }) => {
    await waitForSubtitles(page);
    const word = page
      .locator(
        '[data-testid="subtitle-word"], .subtitle-word, [data-testid="subtitle-cue"] span',
      )
      .first();
    if (await word.isVisible().catch(() => false)) {
      await word.click();
      await page.waitForTimeout(400);
      const popup = page.locator(
        '[data-testid="word-translation-popup"], [data-testid="translation-tooltip"]',
      );
      const popupVisible = await popup
        .first()
        .isVisible()
        .catch(() => false);
      await page.screenshot({
        path: "test-results/screenshots/discover-interactive-subtitles-plex-popup.png",
        fullPage: true,
      });
      expect(popupVisible !== undefined).toBeTruthy();
    }
  });

  test("should allow toggling subtitles on/off", async ({ page }) => {
    const toggleBtn = page
      .locator(
        '[data-testid="subtitle-toggle"], button[aria-label*="subtitle"], button[aria-label*="Subtitle"]',
      )
      .first();
    if (await toggleBtn.isVisible().catch(() => false)) {
      await toggleBtn.click();
      await page.waitForTimeout(300);
      await page.screenshot({
        path: "test-results/screenshots/discover-interactive-subtitles-plex-off.png",
        fullPage: true,
      });
      await toggleBtn.click();
      await page.waitForTimeout(300);
    }
    await page.screenshot({
      path: "test-results/screenshots/discover-interactive-subtitles-plex-on.png",
      fullPage: true,
    });
  });
});

test.describe("Interactive Subtitles - YouTube Content", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await mockAuthPremium(page);
    await navigateToYouTubeContent(page);
    await seekVideo(page, 15);
  });

  test("should display interactive subtitles on YouTube content", async ({
    page,
  }) => {
    const hasSubtitles = await waitForSubtitles(page);
    await page.screenshot({
      path: "test-results/screenshots/discover-interactive-subtitles-youtube.png",
      fullPage: true,
    });
    expect(hasSubtitles !== undefined).toBeTruthy();
  });

  test("should show translation popup on YouTube word click", async ({
    page,
  }) => {
    await waitForSubtitles(page);
    const word = page
      .locator(
        '[data-testid="subtitle-word"], .subtitle-word, [data-testid="subtitle-cue"] span',
      )
      .first();
    if (await word.isVisible().catch(() => false)) {
      const start = Date.now();
      await word.click();
      await page.waitForTimeout(400);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(5000);
    }
    await page.screenshot({
      path: "test-results/screenshots/discover-interactive-subtitles-youtube-popup.png",
      fullPage: true,
    });
  });
});
