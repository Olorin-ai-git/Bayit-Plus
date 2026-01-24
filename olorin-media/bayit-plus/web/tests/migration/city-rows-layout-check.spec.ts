import { test, expect } from '@playwright/test';

test('verify Jerusalem and Tel Aviv city rows layout and colors', async ({ page }) => {
  // Navigate to homepage
  await page.goto('http://localhost:3200', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000); // Wait for content to load

  // Take full page screenshot for reference
  await page.screenshot({ path: '/tmp/city-rows-full-page.png', fullPage: true });

  // Check if Jerusalem Connection section exists
  const jerusalemSection = page.locator('text=/ירושלים|Jerusalem/i').first();
  const isJerusalemVisible = await jerusalemSection.isVisible().catch(() => false);
  console.log('Jerusalem Connection visible:', isJerusalemVisible);

  if (isJerusalemVisible) {
    // Scroll to Jerusalem section
    await jerusalemSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Take screenshot of Jerusalem section
    const jerusalemContainer = page.locator('[class*="JerusalemRow"], [class*="jerusalem"]').first();
    if (await jerusalemContainer.isVisible().catch(() => false)) {
      await jerusalemContainer.screenshot({ path: '/tmp/jerusalem-section.png' });

      // Check text color (should be white/light, not black)
      const textElements = jerusalemContainer.locator('text=/.*[א-ת].*/').or(jerusalemContainer.locator('h1,h2,h3,h4,h5,h6,p,span'));
      const firstTextElement = textElements.first();

      if (await firstTextElement.isVisible().catch(() => false)) {
        const color = await firstTextElement.evaluate((el) => {
          return window.getComputedStyle(el).color;
        });
        console.log('Jerusalem text color:', color);

        // Verify text is not black (rgb(0, 0, 0))
        expect(color).not.toBe('rgb(0, 0, 0)');
      }
    }
  }

  // Check if Tel Aviv Connection section exists
  const telavivSection = page.locator('text=/תל אביב|Tel Aviv/i').first();
  const isTelavivVisible = await telavivSection.isVisible().catch(() => false);
  console.log('Tel Aviv Connection visible:', isTelavivVisible);

  if (isTelavivVisible) {
    // Scroll to Tel Aviv section
    await telavivSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Take screenshot of Tel Aviv section
    const telavivContainer = page.locator('[class*="TelAvivRow"], [class*="telaviv"]').first();
    if (await telavivContainer.isVisible().catch(() => false)) {
      await telavivContainer.screenshot({ path: '/tmp/telaviv-section.png' });

      // Check text color (should be white/light, not black)
      const textElements = telavivContainer.locator('text=/.*[א-ת].*/').or(telavivContainer.locator('h1,h2,h3,h4,h5,h6,p,span'));
      const firstTextElement = textElements.first();

      if (await firstTextElement.isVisible().catch(() => false)) {
        const color = await firstTextElement.evaluate((el) => {
          return window.getComputedStyle(el).color;
        });
        console.log('Tel Aviv text color:', color);

        // Verify text is not black (rgb(0, 0, 0))
        expect(color).not.toBe('rgb(0, 0, 0)');
      }
    }
  }

  // Check for layout issues (overlapping elements, broken cards)
  const contentCards = page.locator('[class*="GlassCard"], [class*="ContentCard"], [class*="content-card"]');
  const cardCount = await contentCards.count();
  console.log('Total content cards found:', cardCount);

  // Verify at least some cards are visible
  expect(cardCount).toBeGreaterThan(0);

  // Check if any elements have negative dimensions or are off-screen
  const allCards = await contentCards.all();
  for (let i = 0; i < Math.min(allCards.length, 5); i++) {
    const card = allCards[i];
    if (await card.isVisible().catch(() => false)) {
      const boundingBox = await card.boundingBox();
      if (boundingBox) {
        console.log(`Card ${i} dimensions:`, boundingBox);
        expect(boundingBox.width).toBeGreaterThan(0);
        expect(boundingBox.height).toBeGreaterThan(0);
      }
    }
  }

  console.log('✅ Layout verification complete');
});

test('verify glassmorphic backgrounds are present', async ({ page }) => {
  await page.goto('http://localhost:3200', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Check for glassmorphic elements
  const glassElements = page.locator('[class*="glass"], [class*="Glass"]');
  const glassCount = await glassElements.count();
  console.log('Glassmorphic elements found:', glassCount);

  // Should have at least some glass elements
  expect(glassCount).toBeGreaterThan(0);

  // Check background styles on first glass element
  const firstGlass = glassElements.first();
  if (await firstGlass.isVisible().catch(() => false)) {
    const bgColor = await firstGlass.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    console.log('Glass element background color:', bgColor);

    // Glassmorphic elements should have semi-transparent backgrounds
    // They typically use rgba() with alpha < 1
    expect(bgColor).toContain('rgba');
  }

  console.log('✅ Glassmorphic background verification complete');
});
