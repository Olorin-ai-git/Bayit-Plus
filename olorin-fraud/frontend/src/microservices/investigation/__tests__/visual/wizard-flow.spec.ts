/**
 * Wizard Flow Visual Regression Test
 * Feature: 004-new-olorin-frontend
 * Test ID: T055
 *
 * Playwright visual regression testing for complete wizard flow.
 * Captures screenshots at key points to detect unintended visual changes.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:3000';

test.describe('Wizard Flow Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/investigation`);
  });

  test('Settings page initial state', async ({ page }) => {
    // Wait for page to fully load
    await page.waitForSelector('text=Investigation Settings');

    // Take full page screenshot
    await expect(page).toHaveScreenshot('settings-initial.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('Settings page with entity added', async ({ page }) => {
    await page.waitForSelector('text=Investigation Settings');

    // Add an entity
    await page.selectOption('select[aria-label="Entity Type"]', 'EMAIL');
    await page.fill('input[aria-label="Entity Value"]', 'test@example.com');
    await page.click('button:has-text("Add Entity")');

    // Wait for entity to appear
    await page.waitForSelector('text=test@example.com');

    // Screenshot with entity added
    await expect(page).toHaveScreenshot('settings-with-entity.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('Settings page validation sidebar', async ({ page }) => {
    await page.waitForSelector('text=Investigation Settings');

    // Focus on validation sidebar
    const sidebar = await page.locator('[data-testid="validation-sidebar"]');
    await expect(sidebar).toBeVisible();

    // Screenshot of validation sidebar
    await expect(sidebar).toHaveScreenshot('validation-sidebar.png');
  });

  test('Progress page with running investigation', async ({ page }) => {
    // Set up investigation and navigate to progress
    await page.goto(`${BASE_URL}/investigation?step=progress`);
    await page.waitForSelector('text=Investigation Progress');

    // Wait for progress components to load
    await page.waitForTimeout(1000);

    // Full page screenshot
    await expect(page).toHaveScreenshot('progress-running.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('Progress page log stream', async ({ page }) => {
    await page.goto(`${BASE_URL}/investigation?step=progress`);
    await page.waitForSelector('text=Investigation Progress');

    // Focus on log stream
    const logStream = await page.locator('[data-testid="log-stream"]');
    await expect(logStream).toBeVisible();

    // Screenshot of log stream
    await expect(logStream).toHaveScreenshot('log-stream.png');
  });

  test('Progress page phase progress', async ({ page }) => {
    await page.goto(`${BASE_URL}/investigation?step=progress`);
    await page.waitForSelector('text=Investigation Progress');

    // Focus on phase progress
    const phaseProgress = await page.locator('[data-testid="phase-progress"]');
    await expect(phaseProgress).toBeVisible();

    // Screenshot of phase progress
    await expect(phaseProgress).toHaveScreenshot('phase-progress.png');
  });

  test('Results page overview tab', async ({ page }) => {
    await page.goto(`${BASE_URL}/investigation?step=results`);
    await page.waitForSelector('text=Investigation Results');

    // Wait for results to load
    await page.waitForTimeout(1000);

    // Full page screenshot
    await expect(page).toHaveScreenshot('results-overview.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('Results page findings tab', async ({ page }) => {
    await page.goto(`${BASE_URL}/investigation?step=results`);
    await page.waitForSelector('text=Investigation Results');

    // Click Findings tab
    await page.click('button:has-text("Findings")');
    await page.waitForTimeout(500);

    // Screenshot of findings tab
    await expect(page).toHaveScreenshot('results-findings.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('Results page timeline tab', async ({ page }) => {
    await page.goto(`${BASE_URL}/investigation?step=results`);
    await page.waitForSelector('text=Investigation Results');

    // Click Timeline tab
    await page.click('button:has-text("Timeline")');
    await page.waitForTimeout(500);

    // Screenshot of timeline tab
    await expect(page).toHaveScreenshot('results-timeline.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('Results page network tab', async ({ page }) => {
    await page.goto(`${BASE_URL}/investigation?step=results`);
    await page.waitForSelector('text=Investigation Results');

    // Click Network tab
    await page.click('button:has-text("Network")');
    await page.waitForTimeout(500);

    // Screenshot of network tab
    await expect(page).toHaveScreenshot('results-network.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('Wizard progress indicator - all steps', async ({ page }) => {
    await page.goto(`${BASE_URL}/investigation`);
    await page.waitForSelector('text=Investigation Settings');

    // Focus on progress indicator
    const progressIndicator = await page.locator('[data-testid="wizard-progress"]');
    await expect(progressIndicator).toBeVisible();

    // Screenshot of progress indicator on step 1
    await expect(progressIndicator).toHaveScreenshot('progress-indicator-step1.png');

    // Navigate to step 2
    await page.goto(`${BASE_URL}/investigation?step=progress`);
    await expect(progressIndicator).toHaveScreenshot('progress-indicator-step2.png');

    // Navigate to step 3
    await page.goto(`${BASE_URL}/investigation?step=results`);
    await expect(progressIndicator).toHaveScreenshot('progress-indicator-step3.png');
  });

  test('Export menu dropdown', async ({ page }) => {
    await page.goto(`${BASE_URL}/investigation?step=results`);
    await page.waitForSelector('text=Investigation Results');

    // Click export button
    await page.click('button:has-text("Export")');
    await page.waitForTimeout(300);

    // Screenshot of export dropdown
    const dropdown = await page.locator('[data-testid="export-dropdown"]');
    await expect(dropdown).toBeVisible();
    await expect(dropdown).toHaveScreenshot('export-dropdown.png');
  });

  test('Investigation summary card', async ({ page }) => {
    await page.goto(`${BASE_URL}/investigation?step=results`);
    await page.waitForSelector('text=Investigation Results');

    // Focus on summary card
    const summary = await page.locator('[data-testid="investigation-summary"]');
    await expect(summary).toBeVisible();

    // Screenshot of summary
    await expect(summary).toHaveScreenshot('investigation-summary.png');
  });

  test('Color consistency - Olorin purple theme', async ({ page }) => {
    await page.goto(`${BASE_URL}/investigation`);
    await page.waitForSelector('text=Investigation Settings');

    // Check primary accent color usage
    const accentElements = await page.locator('.bg-corporate-accentPrimary, .text-corporate-accentPrimary, .border-corporate-accentPrimary');
    const count = await accentElements.count();
    expect(count).toBeGreaterThan(0);

    // Full page to verify color scheme
    await expect(page).toHaveScreenshot('color-theme-verification.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });
});
