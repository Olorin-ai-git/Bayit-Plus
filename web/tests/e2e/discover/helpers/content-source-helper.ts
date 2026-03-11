/**
 * Content Source Helper
 *
 * Navigation helpers for Plex BYOC, YouTube BYOC, and Channel 13 live content.
 * Used across VOD and Live TV Discover tab E2E specs.
 *
 * Fatal runtime errors (ChunkLoadError, webpack overlay) are caught by the
 * error guard fixture installed via discover-test.ts. These helpers focus
 * on navigation and waiting for the video player to load.
 */

import { Page } from "@playwright/test";
import { fixtures } from "./discover-fixtures";
import { hasWebpackErrorOverlay } from "./error-guard";

const BASE_URL = process.env.BASE_URL || "http://localhost:3200";

async function assertNoOverlay(page: Page): Promise<void> {
  await page.waitForTimeout(500);
  if (await hasWebpackErrorOverlay(page)) {
    const screenshotPath = `/tmp/discover-e2e-report/web/error-screenshots/overlay-${Date.now()}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    throw new Error(
      `Webpack error overlay detected - app has compilation errors. Screenshot: ${screenshotPath}`,
    );
  }
}

export async function navigateToPlexContent(page: Page): Promise<void> {
  const contentId = fixtures.content.plexContentId;
  await page.goto(`${BASE_URL}/watch/${contentId}?source=plex`);
  await page.waitForLoadState("networkidle");
  await assertNoOverlay(page);
  await page.waitForSelector('video, [data-testid="video-player"]', {
    timeout: 10000,
  });
}

export async function navigateToYouTubeContent(page: Page): Promise<void> {
  const contentId = fixtures.content.youtubeContentId;
  await page.goto(`${BASE_URL}/watch/${contentId}?source=youtube`);
  await page.waitForLoadState("networkidle");
  await assertNoOverlay(page);
  await page.waitForSelector('video, [data-testid="video-player"]', {
    timeout: 10000,
  });
}

export async function navigateToChannel13(page: Page): Promise<void> {
  const slug = fixtures.content.liveChannelSlug;
  await page.goto(`${BASE_URL}/live/${slug}`);
  await page.waitForLoadState("networkidle");
  await assertNoOverlay(page);
  await page.waitForSelector('video, [data-testid="video-player"]', {
    timeout: 10000,
  });
}

export async function openPlayerPanel(
  page: Page,
  panelTestId: string,
): Promise<boolean> {
  const btn = page.locator(`[data-testid="${panelTestId}"]`);
  const visible = await btn.isVisible({ timeout: 5000 }).catch(() => false);
  if (visible) {
    await btn.click();
    await page.waitForTimeout(500);
    return true;
  }
  const ariaBtn = page.locator(`button[aria-label*="${panelTestId}"]`).first();
  const ariaVisible = await ariaBtn
    .isVisible({ timeout: 2000 })
    .catch(() => false);
  if (ariaVisible) {
    await ariaBtn.click();
    await page.waitForTimeout(500);
    return true;
  }
  return false;
}

export async function measureResponseTime(
  page: Page,
  action: () => Promise<void>,
): Promise<number> {
  const start = Date.now();
  await action();
  return Date.now() - start;
}

export async function seekVideo(page: Page, seconds: number): Promise<void> {
  await page.evaluate((t) => {
    const video = document.querySelector("video") as HTMLVideoElement;
    if (video) {
      video.currentTime = t;
    }
  }, seconds);
  await page.waitForTimeout(300);
}

export async function getVideoCurrentTime(page: Page): Promise<number> {
  return page.evaluate(() => {
    const video = document.querySelector("video") as HTMLVideoElement;
    return video?.currentTime ?? 0;
  });
}
