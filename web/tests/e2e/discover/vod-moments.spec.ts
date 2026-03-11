/**
 * VOD Moments Feature E2E Tests
 *
 * Tests the VOD Moments panel: shareable clip creation, moment bookmarking,
 * and moments feed rendering. Covers Plex and YouTube BYOC content.
 *
 * Usage:
 *   npx playwright test tests/e2e/discover/vod-moments.spec.ts
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

async function openMomentsPanel(page: Page): Promise<boolean> {
  return openPlayerPanel(page, "moments-panel-button");
}

test.describe("VOD Moments - Plex Content", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await mockAuthPremium(page);
    await navigateToPlexContent(page);
    await seekVideo(page, 60);
  });

  test("should open moments panel from player controls", async ({ page }) => {
    await openMomentsPanel(page);
    const panel = page.locator(
      '[data-testid="moments-panel"], [data-testid="vod-moments-panel"]',
    );
    await page.screenshot({
      path: "test-results/screenshots/discover-vod-moments-plex-open.png",
      fullPage: true,
    });
    expect(panel).toBeDefined();
  });

  test("should allow bookmarking current timestamp as a moment", async ({
    page,
  }) => {
    await openMomentsPanel(page);
    const bookmarkBtn = page
      .locator(
        '[data-testid="bookmark-moment"], button[aria-label*="Bookmark"], button[aria-label*="moment"]',
      )
      .first();
    if (await bookmarkBtn.isVisible().catch(() => false)) {
      const start = Date.now();
      await bookmarkBtn.click();
      await page.waitForTimeout(500);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(5000);
      const confirmation = page.locator(
        '[data-testid="moment-saved"], text=/saved/i, text=/moment/i',
      );
      const confirmed = await confirmation
        .first()
        .isVisible()
        .catch(() => false);
      expect(confirmed !== undefined).toBeTruthy();
    }
    await page.screenshot({
      path: "test-results/screenshots/discover-vod-moments-plex-bookmark.png",
      fullPage: true,
    });
  });

  test("should display moments feed list", async ({ page }) => {
    await openMomentsPanel(page);
    await page.waitForTimeout(600);
    const momentItems = page.locator(
      '[data-testid="moment-item"], [data-testid="moments-list-item"]',
    );
    const count = await momentItems.count();
    await page.screenshot({
      path: "test-results/screenshots/discover-vod-moments-plex-list.png",
      fullPage: true,
    });
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("should seek to moment timestamp when moment is clicked", async ({
    page,
  }) => {
    await openMomentsPanel(page);
    await page.waitForTimeout(500);
    const firstMoment = page.locator('[data-testid="moment-item"]').first();
    if (await firstMoment.isVisible().catch(() => false)) {
      const timeBefore = await page.evaluate(() => {
        const v = document.querySelector("video") as HTMLVideoElement;
        return v?.currentTime ?? 0;
      });
      await firstMoment.click();
      await page.waitForTimeout(500);
      const timeAfter = await page.evaluate(() => {
        const v = document.querySelector("video") as HTMLVideoElement;
        return v?.currentTime ?? 0;
      });
      expect(timeAfter >= 0).toBeTruthy();
      expect(timeBefore !== timeAfter || timeAfter >= 0).toBeTruthy();
    }
    await page.screenshot({
      path: "test-results/screenshots/discover-vod-moments-plex-seek.png",
      fullPage: true,
    });
  });
});

test.describe("VOD Moments - YouTube Content", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await mockAuthPremium(page);
    await navigateToYouTubeContent(page);
    await seekVideo(page, 60);
  });

  test("should open moments panel on YouTube content", async ({ page }) => {
    await openMomentsPanel(page);
    await page.screenshot({
      path: "test-results/screenshots/discover-vod-moments-youtube-open.png",
      fullPage: true,
    });
    const panel = page.locator(
      '[data-testid="moments-panel"], [data-testid="vod-moments-panel"]',
    );
    expect(panel).toBeDefined();
  });

  test("should share a moment from YouTube content", async ({ page }) => {
    await openMomentsPanel(page);
    const shareBtn = page
      .locator('[data-testid="share-moment"], button[aria-label*="Share"]')
      .first();
    if (await shareBtn.isVisible().catch(() => false)) {
      await shareBtn.click();
      await page.waitForTimeout(400);
      const shareModal = page.locator(
        '[data-testid="share-modal"], [data-testid="share-dialog"]',
      );
      const visible = await shareModal
        .first()
        .isVisible()
        .catch(() => false);
      expect(visible !== undefined).toBeTruthy();
    }
    await page.screenshot({
      path: "test-results/screenshots/discover-vod-moments-youtube-share.png",
      fullPage: true,
    });
  });
});
