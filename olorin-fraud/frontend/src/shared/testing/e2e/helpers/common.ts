/**
 * Common E2E Test Utilities
 *
 * Reusable helpers for Playwright tests:
 * - Page navigation
 * - Element waiting
 * - Data verification
 * - Accessibility checks
 */

import { Page, expect } from '@playwright/test';

/**
 * Wait for and verify page navigation
 */
export async function navigateAndWait(page: Page, url: string, timeout = 10000) {
  await page.goto(url);
  await page.waitForLoadState('networkidle', { timeout });
  return page;
}

/**
 * Wait for table to load with data
 */
export async function waitForTable(page: Page, timeout = 10000) {
  const table = page.locator('table, [role="table"]');
  await table.waitFor({ state: 'attached', timeout });

  // Wait for at least one row
  const rows = page.locator('tbody tr, [role="row"]');
  await rows.first().waitFor({ state: 'attached', timeout });

  return table;
}

/**
 * Get table row count
 */
export async function getTableRowCount(page: Page): Promise<number> {
  const rows = page.locator('tbody tr, [role="row"]');
  return rows.count();
}

/**
 * Get cell value from table
 */
export async function getTableCell(page: Page, rowIndex: number, cellIndex: number): Promise<string> {
  const cell = page.locator(
    `tbody tr:nth-child(${rowIndex + 1}) td:nth-child(${cellIndex + 1}), ` +
    `[role="row"]:nth-child(${rowIndex + 1}) [role="cell"]:nth-child(${cellIndex + 1})`
  );
  return cell.textContent({ timeout: 5000 }).then(t => t?.trim() || '');
}

/**
 * Wait for element to be visible and click
 */
export async function clickWhenReady(page: Page, selector: string, timeout = 5000) {
  const element = page.locator(selector);
  await element.waitFor({ state: 'visible', timeout });
  await element.click();
}

/**
 * Wait for and verify loading state
 */
export async function waitForLoadingComplete(page: Page, timeout = 10000) {
  // Wait for loading spinner to disappear
  const spinner = page.locator('[class*="spinner"], [class*="loading"]');

  try {
    await spinner.waitFor({ state: 'hidden', timeout });
  } catch {
    // Spinner might not exist, which is fine
  }

  // Wait for network idle
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Verify accessibility attributes
 */
export async function verifyAccessibility(page: Page) {
  // Check for main content landmark
  const main = page.locator('main, [role="main"]');
  const hasMain = await main.count() > 0;

  // Check for headings
  const headings = page.locator('h1, h2, h3, [role="heading"]');
  const hasHeadings = await headings.count() > 0;

  // Check for buttons
  const buttons = page.locator('button, [role="button"]');
  const hasButtons = await buttons.count() > 0;

  return {
    hasMain,
    hasHeadings,
    hasButtons,
    isAccessible: hasMain && hasHeadings,
  };
}

/**
 * Get all visible text content from element
 */
export async function getElementText(page: Page, selector: string): Promise<string> {
  const element = page.locator(selector);
  return element.textContent({ timeout: 5000 }).then(t => t?.trim() || '');
}

/**
 * Wait for and verify error message
 */
export async function verifyErrorMessage(page: Page, expectedText: string, timeout = 5000): Promise<boolean> {
  try {
    const errorElement = page.locator(`text=${expectedText}`);
    await errorElement.waitFor({ state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}

/**
 * Wait for and verify success message
 */
export async function verifySuccessMessage(page: Page, expectedText: string, timeout = 5000): Promise<boolean> {
  try {
    const successElement = page.locator(`text=${expectedText}`);
    await successElement.waitFor({ state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get all text values from column
 */
export async function getColumnValues(page: Page, columnIndex: number): Promise<string[]> {
  const cells = page.locator(
    `tbody tr td:nth-child(${columnIndex + 1}), ` +
    `[role="row"] [role="cell"]:nth-child(${columnIndex + 1})`
  );

  const count = await cells.count();
  const values: string[] = [];

  for (let i = 0; i < count; i++) {
    const text = await cells.nth(i).textContent({ timeout: 5000 });
    values.push(text?.trim() || '');
  }

  return values;
}

/**
 * Verify page has specific elements
 */
export async function verifyPageElements(page: Page, selectors: Record<string, string>): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};

  for (const [name, selector] of Object.entries(selectors)) {
    const count = await page.locator(selector).count();
    results[name] = count > 0;
  }

  return results;
}

/**
 * Take screenshot for debugging
 */
export async function captureDebugScreenshot(page: Page, name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `debug-${name}-${timestamp}.png`;
  await page.screenshot({ path: filename });
  console.log(`Screenshot saved: ${filename}`);
}

/**
 * Measure page performance metrics
 */
export async function measurePageMetrics(page: Page) {
  const metrics = await page.evaluate(() => {
    const perfData = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    return {
      domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
      loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
      domInteractive: perfData.domInteractive - perfData.fetchStart,
      firstContentfulPaint: (performance.getEntriesByName('first-contentful-paint')[0] as PerformancePaintTiming)?.startTime || 0,
    };
  }).catch(() => ({ domContentLoaded: 0, loadComplete: 0, domInteractive: 0, firstContentfulPaint: 0 }));

  return metrics;
}

/**
 * Simulate user scroll and interactions
 */
export async function simulateUserScroll(page: Page, direction: 'up' | 'down' = 'down', amount = 3) {
  for (let i = 0; i < amount; i++) {
    await page.evaluate(() => {
      window.scrollBy(0, direction === 'down' ? 300 : -300);
    });
    await page.waitForTimeout(200);
  }
}

/**
 * Type text slowly to simulate user input
 */
export async function typeSlowly(page: Page, selector: string, text: string, delay = 50) {
  const input = page.locator(selector);
  await input.focus();

  for (const char of text) {
    await input.type(char, { delay });
  }
}

/**
 * Verify element visibility in viewport
 */
export async function isElementInViewport(page: Page, selector: string): Promise<boolean> {
  return page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (!element) return false;

    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }, selector);
}

/**
 * Wait for all network requests to complete
 */
export async function waitForNetworkIdle(page: Page, timeout = 10000) {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Get all form validation errors
 */
export async function getFormErrors(page: Page): Promise<string[]> {
  const errorMessages = page.locator('[class*="error"], [class*="invalid"]');
  const count = await errorMessages.count();
  const errors: string[] = [];

  for (let i = 0; i < count; i++) {
    const text = await errorMessages.nth(i).textContent({ timeout: 5000 });
    if (text?.trim()) {
      errors.push(text.trim());
    }
  }

  return errors;
}
