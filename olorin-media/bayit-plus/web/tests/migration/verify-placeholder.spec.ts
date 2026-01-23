import { test } from '@playwright/test';

test('verify placeholder thumbnails', async ({ page }) => {
  await page.goto('http://localhost:3000', { timeout: 60000 });
  await page.waitForTimeout(8000);

  // Scroll down to see movies section
  await page.evaluate(() => window.scrollBy(0, 300));
  await page.waitForTimeout(1000);

  // Take screenshot
  await page.screenshot({ path: '/tmp/placeholder-verify.png', fullPage: false });

  // Find content cards with placeholders (gradient backgrounds)
  const placeholders = await page.evaluate(() => {
    const cards: any[] = [];
    document.querySelectorAll('[class*="thumbnailPlaceholder"], [class*="linear-gradient"]').forEach((el, i) => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 50) {
        cards.push({
          index: i,
          size: `${rect.width.toFixed(0)}x${rect.height.toFixed(0)}`,
          hasEmoji: el.textContent?.includes('🎬') || el.textContent?.includes('📺'),
        });
      }
    });
    return cards;
  });

  console.log('Placeholder cards found:', placeholders);
  console.log('Screenshot saved to /tmp/placeholder-verify.png');
});
