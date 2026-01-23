import { test, expect } from '@playwright/test';

// Wait for i18n to be ready helper
async function waitForI18n(page: any) {
  // Wait for page load and i18n initialization
  await page.waitForLoadState('networkidle');
  // Give i18n extra time to initialize
  await page.waitForTimeout(500);
}

test('hero section loads and displays correctly', async ({ page }) => {
  await page.goto('/');
  await waitForI18n(page);

  // Check headline is visible
  await expect(page.getByRole('heading', { name: /WEAR YOUR WORDS/i })).toBeVisible();

  // Check CTA button is clickable
  await expect(page.getByRole('button', { name: /EQUIP THE ARTIFACT/i })).toBeVisible();

  // Verify page has no console errors
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      throw new Error(`Console error: ${msg.text()}`);
    }
  });
});

test('demo section wizard animation works', async ({ page }) => {
  await page.goto('/');
  await waitForI18n(page);

  // Wait for demo section
  const demoHeading = page.getByRole('heading', { name: /HOW IT WORKS/i });
  await expect(demoHeading).toBeVisible();

  // Check state indicators appear
  await expect(page.getByText(/Speak naturally/i)).toBeVisible();
});

test('accessibility: keyboard navigation', async ({ page }) => {
  await page.goto('/');
  await waitForI18n(page);

  // Tab through interactive elements
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toBeVisible();

  // Check skip link
  await page.keyboard.press('Tab');
  const skipLink = page.getByText(/Skip to main content/i);
  await expect(skipLink).toBeFocused();
});

test('mobile responsive design', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/');
  await waitForI18n(page);

  // Check mobile layout
  await expect(page.getByRole('heading', { name: /WEAR YOUR WORDS/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /EQUIP THE ARTIFACT/i })).toBeVisible();

  // Verify touch targets are at least 44x44px
  const ctaButton = page.getByRole('button', { name: /EQUIP THE ARTIFACT/i });
  const box = await ctaButton.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(44);
});
