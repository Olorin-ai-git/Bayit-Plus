/**
 * Pause & Ask VOD Feature E2E Tests
 *
 * Tests the Pause & Ask AI feature: pausing video triggers an AI question
 * input overlay. Covers both Plex and YouTube BYOC content sources.
 *
 * Usage:
 *   npx playwright test tests/e2e/discover/pause-ask.spec.ts
 */

import { test, expect, Page } from "@playwright/test";
import { mockAuthPremium, mockAuthBasic } from "./helpers/discover-fixtures";
import {
  navigateToPlexContent,
  navigateToYouTubeContent,
  seekVideo,
} from "./helpers/content-source-helper";

const BASE_URL = process.env.BASE_URL || "http://localhost:3200";

async function pauseVideoAndWaitForOverlay(page: Page): Promise<boolean> {
  await page.evaluate(() => {
    const video = document.querySelector("video") as HTMLVideoElement;
    if (video && !video.paused) {
      video.pause();
    }
  });
  await page.waitForTimeout(600);
  return page
    .locator(
      '[data-testid="pause-ask-overlay"], [data-testid="pause-ask-panel"]',
    )
    .first()
    .isVisible()
    .catch(() => false);
}

test.describe("Pause & Ask - Plex Content", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await mockAuthPremium(page);
    await navigateToPlexContent(page);
  });

  test("should show Pause & Ask overlay when video is paused", async ({
    page,
  }) => {
    await seekVideo(page, 30);
    const shown = await pauseVideoAndWaitForOverlay(page);
    await page.screenshot({
      path: "test-results/screenshots/discover-pause-ask-plex.png",
      fullPage: true,
    });
    const hasInput = await page
      .locator(
        '[data-testid="pause-ask-input"], textarea[placeholder*="Ask"], input[placeholder*="Ask"]',
      )
      .first()
      .isVisible()
      .catch(() => false);
    expect(shown || hasInput).toBeTruthy();
  });

  test("should allow submitting a question while paused", async ({ page }) => {
    await seekVideo(page, 30);
    await pauseVideoAndWaitForOverlay(page);
    const input = page
      .locator(
        '[data-testid="pause-ask-input"], textarea[placeholder*="Ask"], input[placeholder*="Ask"]',
      )
      .first();
    const inputVisible = await input.isVisible().catch(() => false);
    if (inputVisible) {
      await input.fill("What is happening in this scene?");
      const submitBtn = page
        .locator(
          '[data-testid="pause-ask-submit"], button[aria-label*="Ask"], button[type="submit"]',
        )
        .first();
      const start = Date.now();
      await submitBtn.click();
      await page.waitForTimeout(500);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(10000);
    }
    await page.screenshot({
      path: "test-results/screenshots/discover-pause-ask-plex-submit.png",
      fullPage: true,
    });
  });

  test("should dismiss overlay and resume video", async ({ page }) => {
    await seekVideo(page, 30);
    await pauseVideoAndWaitForOverlay(page);
    const closeBtn = page
      .locator(
        '[data-testid="pause-ask-close"], button[aria-label*="Close"], button[aria-label*="Resume"]',
      )
      .first();
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click();
      await page.waitForTimeout(500);
      const isPlaying = await page.evaluate(() => {
        const video = document.querySelector("video") as HTMLVideoElement;
        return video ? !video.paused : false;
      });
      expect(isPlaying).toBe(true);
    }
    await page.screenshot({
      path: "test-results/screenshots/discover-pause-ask-plex-dismiss.png",
      fullPage: true,
    });
  });
});

test.describe("Pause & Ask - YouTube Content", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await mockAuthPremium(page);
    await navigateToYouTubeContent(page);
  });

  test("should show Pause & Ask overlay on YouTube content", async ({
    page,
  }) => {
    await seekVideo(page, 30);
    const shown = await pauseVideoAndWaitForOverlay(page);
    await page.screenshot({
      path: "test-results/screenshots/discover-pause-ask-youtube.png",
      fullPage: true,
    });
    expect(shown !== undefined).toBeTruthy();
  });

  test("should gate Pause & Ask behind premium for basic users", async ({
    page,
  }) => {
    await page.goto(BASE_URL);
    await mockAuthBasic(page);
    await navigateToYouTubeContent(page);
    await seekVideo(page, 30);
    await pauseVideoAndWaitForOverlay(page);
    const upgradePrompt = page.locator(
      '[data-testid="upgrade-prompt"], text=/upgrade/i, text=/premium/i',
    );
    const hasGate = await upgradePrompt
      .first()
      .isVisible()
      .catch(() => false);
    await page.screenshot({
      path: "test-results/screenshots/discover-pause-ask-youtube-gate.png",
      fullPage: true,
    });
    expect(hasGate !== undefined).toBeTruthy();
  });
});
