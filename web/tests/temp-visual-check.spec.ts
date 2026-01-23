import { test, expect } from '@playwright/test';

test('full page visual check', async ({ page }) => {
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  
  // Full page screenshot
  await page.screenshot({ path: '/tmp/homepage-full.png', fullPage: true });
  
  // Check for specific elements
  const contentCards = page.locator('[class*="GlassCard"], [class*="content-card"]');
  
  // Check Jerusalem row
  const jerusalemRow = page.locator('text=ירושלים').first();
  const telavivRow = page.locator('text=תל אביב').first();
  
  console.log('Content cards count:', await contentCards.count());
  console.log('Jerusalem row visible:', await jerusalemRow.isVisible().catch(() => false));
  console.log('Tel Aviv row visible:', await telavivRow.isVisible().catch(() => false));
  
  // Scroll down and take another screenshot
  await page.evaluate(() => window.scrollBy(0, 800));
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/scrolled-section.png' });
});
