import { test, expect } from '@playwright/test';

test('debug subtitle flags on carousel', async ({ page }) => {
  // Navigate to home page
  await page.goto('http://localhost:3000');

  // Wait for carousel to load
  await page.waitForTimeout(3000);

  // Take full page screenshot
  await page.screenshot({
    path: 'test-results/homepage-full.png',
    fullPage: true
  });

  // Find carousel items
  const carouselItems = await page.locator('[class*="carousel"]').first();

  // Take screenshot of carousel area
  await carouselItems.screenshot({
    path: 'test-results/carousel-area.png'
  });

  // Look for any subtitle flag elements
  const subtitleFlags = await page.locator('[class*="SubtitleFlag"], [class*="subtitle-flag"], [class*="flags"]').all();
  console.log(`Found ${subtitleFlags.length} potential subtitle flag elements`);

  // Check for 25th Hour or any movie with subtitles
  const allText = await page.locator('text=/25th|Hour|subtitle/i').all();
  console.log(`Found ${allText.length} elements with relevant text`);

  // Get all images to see poster structure
  const images = await page.locator('img').all();
  console.log(`Found ${images.length} images on page`);

  for (let i = 0; i < Math.min(5, images.length); i++) {
    const alt = await images[i].getAttribute('alt');
    const src = await images[i].getAttribute('src');
    console.log(`Image ${i}: alt="${alt}", src="${src?.substring(0, 50)}..."`);
  }

  // Take screenshot after 5 seconds to ensure everything loaded
  await page.waitForTimeout(5000);
  await page.screenshot({
    path: 'test-results/homepage-after-5s.png',
    fullPage: true
  });
});
