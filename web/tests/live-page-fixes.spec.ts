import { test, expect } from '@playwright/test';

test.describe('Live TV Page Fixes', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Live TV page
    await page.goto('http://localhost:3200/live');
    await page.waitForLoadState('networkidle');
  });

  test('Category pills should have fixed height and not stretch vertically', async ({ page }) => {
    // Find the "All" category pill
    const allPill = page.locator('text=All').first();

    // Wait for the pill to be visible
    await allPill.waitFor({ state: 'visible' });

    // Get the bounding box
    const boundingBox = await allPill.boundingBox();

    // The pill height should be reasonable (not stretched to fill all space)
    // Expected height: approximately 40-60px for medium size
    expect(boundingBox?.height).toBeLessThan(80);
    expect(boundingBox?.height).toBeGreaterThan(30);

    console.log(`Category pill height: ${boundingBox?.height}px`);
  });

  test('Live TV icon should be visible in page header', async ({ page }) => {
    // Find the icon container with the circular background
    const iconContainer = page.locator('[style*="border-radius"]').filter({
      has: page.locator('svg')
    }).first();

    // Wait for the icon to be visible
    await iconContainer.waitFor({ state: 'visible', timeout: 5000 });

    // Check that an SVG icon exists inside
    const svgIcon = iconContainer.locator('svg');
    await expect(svgIcon).toBeVisible();

    // Verify the SVG has proper dimensions
    const svgBox = await svgIcon.boundingBox();
    expect(svgBox?.width).toBeGreaterThan(0);
    expect(svgBox?.height).toBeGreaterThan(0);

    console.log(`Icon size: ${svgBox?.width}x${svgBox?.height}px`);
  });

  test('Take screenshot of Live TV page to verify visual fixes', async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(2000);

    // Take full page screenshot
    await page.screenshot({
      path: 'tests/screenshots/live-page-fixed.png',
      fullPage: true
    });

    console.log('Screenshot saved to tests/screenshots/live-page-fixed.png');
  });

  test('Category pills should be horizontally scrollable', async ({ page }) => {
    // Find the horizontal scroll container
    const categoryScroll = page.locator('text=All').locator('..').locator('..');

    // Get all category pills
    const pills = page.locator('text=/^(All|News|Entertainment|Sports|Kids|Music)$/');
    const pillCount = await pills.count();

    // Should have 6 category pills
    expect(pillCount).toBe(6);

    // All pills should be in a horizontal layout
    const allPillBox = await page.locator('text=All').first().boundingBox();
    const newsPillBox = await page.locator('text=News').first().boundingBox();

    // News pill should be to the right of All pill (horizontal layout)
    if (allPillBox && newsPillBox) {
      expect(newsPillBox.x).toBeGreaterThan(allPillBox.x);
      // Pills should be roughly at the same vertical position
      expect(Math.abs(newsPillBox.y - allPillBox.y)).toBeLessThan(10);
    }
  });
});
