/**
 * Error Guard for Discover E2E Tests
 *
 * Monitors browser console for runtime errors (ChunkLoadError, uncaught
 * exceptions, webpack overlay). Takes a screenshot and fails the test
 * immediately when a blocking error is detected.
 */

import { Page, TestInfo, test } from "@playwright/test";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FATAL_ERROR_PATTERNS = [
  "ChunkLoadError",
  "Loading chunk",
  "Uncaught runtime errors",
  "Failed to fetch dynamically imported module",
  "Unexpected token '<'",
  "SyntaxError",
  "Cannot read properties of undefined",
  "Cannot read properties of null",
];

const REPORT_DIR = "/tmp/discover-e2e-report/web/error-screenshots";

interface CollectedError {
  text: string;
  type: string;
  timestamp: number;
}

/**
 * Attaches an error listener to the page. If a fatal error is detected:
 * 1. Takes a screenshot
 * 2. Saves it to the report directory
 * 3. Attaches it to the Playwright test report
 * 4. Throws to abort the test
 */
export function installErrorGuard(page: Page, testInfo: TestInfo): void {
  const errors: CollectedError[] = [];

  page.on("pageerror", (error) => {
    const msg = error.message || error.toString();
    const isFatal = FATAL_ERROR_PATTERNS.some((p) => msg.includes(p));
    if (isFatal) {
      errors.push({ text: msg, type: "pageerror", timestamp: Date.now() });
    }
  });

  page.on("console", (consoleMsg) => {
    if (consoleMsg.type() !== "error") return;
    const text = consoleMsg.text();
    const isFatal = FATAL_ERROR_PATTERNS.some((p) => text.includes(p));
    if (isFatal) {
      errors.push({ text, type: "console.error", timestamp: Date.now() });
    }
  });

  // Store errors on the page object for retrieval
  (page as any).__discoverErrors = errors;
}

/**
 * Checks collected errors and fails the test if any fatal error was detected.
 * Call this after navigation or after waiting for page load.
 */
export async function assertNoFatalErrors(
  page: Page,
  testInfo: TestInfo,
): Promise<void> {
  const errors: CollectedError[] = (page as any).__discoverErrors || [];
  if (errors.length === 0) return;

  const screenshotPath = path.join(
    REPORT_DIR,
    `${testInfo.title.replace(/[^a-zA-Z0-9]/g, "-")}-${Date.now()}.png`,
  );

  await page.screenshot({ path: screenshotPath, fullPage: true });

  await testInfo.attach("fatal-error-screenshot", {
    path: screenshotPath,
    contentType: "image/png",
  });

  const errorSummary = errors
    .map((e) => `[${e.type}] ${e.text.slice(0, 200)}`)
    .join("\n");

  // Also check for webpack error overlay in DOM
  const overlayVisible = await page
    .locator('[id="webpack-dev-server-client-overlay"]')
    .isVisible({ timeout: 1000 })
    .catch(() => false);

  if (overlayVisible) {
    await testInfo.attach("webpack-overlay-screenshot", {
      path: screenshotPath,
      contentType: "image/png",
    });
  }

  // Clear errors after reporting
  errors.length = 0;

  throw new Error(
    `Fatal runtime error detected - stopping test.\n\n${errorSummary}\n\nScreenshot: ${screenshotPath}`,
  );
}

/**
 * Checks for webpack error overlay in the DOM.
 * Returns true if the overlay is visible.
 */
export async function hasWebpackErrorOverlay(page: Page): Promise<boolean> {
  return page
    .locator(
      '[id="webpack-dev-server-client-overlay"], ' +
        '[class*="error-overlay"], ' +
        'text="Compiled with problems"',
    )
    .first()
    .isVisible({ timeout: 2000 })
    .catch(() => false);
}
