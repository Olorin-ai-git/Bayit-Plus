/**
 * Console Errors Check - Design Tokens
 * Verifies no console errors related to styles, colors, or design tokens
 */

import { test, expect } from '@playwright/test';

test.describe('Console Errors Check', () => {
  test('No color-related console errors on Home page', async ({ page }) => {
    const consoleMessages: { type: string; text: string }[] = [];

    // Capture all console messages
    page.on('console', (msg) => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
      });
    });

    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Filter for errors and warnings
    const errors = consoleMessages.filter((msg) => msg.type === 'error');
    const warnings = consoleMessages.filter((msg) => msg.type === 'warning');

    // Check for color/style-related errors
    const styleErrors = errors.filter(
      (msg) =>
        msg.text.toLowerCase().includes('color') ||
        msg.text.toLowerCase().includes('style') ||
        msg.text.toLowerCase().includes('css') ||
        msg.text.toLowerCase().includes('tailwind') ||
        msg.text.toLowerCase().includes('glass')
    );

    console.log('\n--- Console Messages Summary ---');
    console.log(`Total errors: ${errors.length}`);
    console.log(`Total warnings: ${warnings.length}`);
    console.log(`Style-related errors: ${styleErrors.length}`);

    if (errors.length > 0) {
      console.log('\n--- All Errors ---');
      errors.forEach((err, i) => {
        console.log(`${i + 1}. ${err.text}`);
      });
    }

    if (styleErrors.length > 0) {
      console.log('\n--- Style-Related Errors ---');
      styleErrors.forEach((err, i) => {
        console.log(`${i + 1}. ${err.text}`);
      });
    }

    // Assert no style-related errors
    expect(styleErrors).toHaveLength(0);
  });

  test('No color-related console errors on Search page', async ({ page }) => {
    const consoleMessages: { type: string; text: string }[] = [];

    page.on('console', (msg) => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
      });
    });

    await page.goto('/search', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    const errors = consoleMessages.filter((msg) => msg.type === 'error');
    const styleErrors = errors.filter(
      (msg) =>
        msg.text.toLowerCase().includes('color') ||
        msg.text.toLowerCase().includes('style') ||
        msg.text.toLowerCase().includes('design-tokens')
    );

    console.log('\n--- Search Page Console ---');
    console.log(`Total errors: ${errors.length}`);
    console.log(`Style-related errors: ${styleErrors.length}`);

    if (styleErrors.length > 0) {
      console.log('\n--- Style Errors ---');
      styleErrors.forEach((err) => console.log(err.text));
    }

    expect(styleErrors).toHaveLength(0);
  });

  test('No color-related console errors on Live TV page', async ({ page }) => {
    const consoleMessages: { type: string; text: string }[] = [];

    page.on('console', (msg) => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
      });
    });

    await page.goto('/live', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    const errors = consoleMessages.filter((msg) => msg.type === 'error');
    const styleErrors = errors.filter(
      (msg) =>
        msg.text.toLowerCase().includes('color') ||
        msg.text.toLowerCase().includes('style')
    );

    console.log('\n--- Live TV Page Console ---');
    console.log(`Total errors: ${errors.length}`);
    console.log(`Style-related errors: ${styleErrors.length}`);

    expect(styleErrors).toHaveLength(0);
  });
});
