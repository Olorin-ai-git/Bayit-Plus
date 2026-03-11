/**
 * Discover Test Fixture
 *
 * Extended Playwright test that automatically installs the error guard
 * on every page. Catches ChunkLoadError, webpack overlay, and other
 * fatal runtime errors — takes a screenshot and fails the test immediately.
 *
 * Usage in spec files:
 *   import { test, expect } from "./helpers/discover-test";
 *   // instead of:
 *   import { test, expect } from "@playwright/test";
 */

import { test as base, expect, Page, TestInfo } from "@playwright/test";
import {
  installErrorGuard,
  assertNoFatalErrors,
  hasWebpackErrorOverlay,
} from "./error-guard";
import * as fs from "fs";

const SCREENSHOT_DIR = "/tmp/discover-e2e-report/web/error-screenshots";

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

export const test = base.extend<{ discoverPage: Page }>({
  // Auto-install error guard on every page
  page: async ({ page }, use, testInfo) => {
    installErrorGuard(page, testInfo);

    // After every navigation, check for fatal errors
    page.on("load", async () => {
      try {
        // Brief delay for error overlay to render
        await page.waitForTimeout(300);

        if (await hasWebpackErrorOverlay(page)) {
          const screenshotPath = `${SCREENSHOT_DIR}/fatal-${Date.now()}.png`;
          await page.screenshot({ path: screenshotPath, fullPage: true });
          await testInfo.attach("fatal-webpack-overlay", {
            path: screenshotPath,
            contentType: "image/png",
          });
        }
      } catch {
        // Page might have navigated away during check
      }
    });

    await use(page);

    // After test completes, check for any unhandled fatal errors
    try {
      await assertNoFatalErrors(page, testInfo);
    } catch (e) {
      // Error already attached to testInfo, re-throw if test passed
      // (to catch errors that happened after the last assertion)
      if (testInfo.status === "passed") {
        throw e;
      }
    }
  },
});

export { expect };
export type { Page } from "@playwright/test";
