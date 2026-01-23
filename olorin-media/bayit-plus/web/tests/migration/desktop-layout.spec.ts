import { test } from '@playwright/test';

test('desktop layout verification', async ({ browser }) => {
  // Create a desktop-sized context
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();

  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000); // Wait for content to load

  // Full page screenshot at top
  await page.screenshot({ path: 'test-results/screenshots/desktop-home-top.png' });

  // Scroll to culture rows
  await page.evaluate(() => window.scrollTo(0, 1200));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'test-results/screenshots/desktop-culture-rows.png' });

  // Scroll to content carousels
  await page.evaluate(() => window.scrollTo(0, 2400));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'test-results/screenshots/desktop-content-carousels.png' });

  await context.close();
});
