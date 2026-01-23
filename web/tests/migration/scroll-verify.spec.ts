import { test } from '@playwright/test';

test('scroll and capture', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  await page.evaluate(() => window.scrollTo(0, 800));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'test-results/screenshots/culture-row-restored.png' });
  
  await page.evaluate(() => window.scrollTo(0, 1600));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'test-results/screenshots/content-cards-restored.png' });
});
