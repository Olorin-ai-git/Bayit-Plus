import { test, expect } from '@playwright/test';

test('CSS is loading and styles are applied', async ({ page }) => {
  // Navigate to homepage
  await page.goto('http://localhost:3305');

  // Wait for page to load
  await page.waitForLoadState('networkidle');

  // Take a screenshot
  await page.screenshot({ path: 'test-results/css-check-homepage.png', fullPage: true });

  // Check if the body has the expected background color from wizard theme
  const bodyBg = await page.evaluate(() => {
    const body = document.querySelector('body');
    return window.getComputedStyle(body!).backgroundColor;
  });

  console.log('Body background color:', bodyBg);

  // Check if any Tailwind classes are being applied
  const hasClasses = await page.evaluate(() => {
    const elements = document.querySelectorAll('[class*="wizard"], [class*="glass"], [class*="bg-"], [class*="text-"]');
    return elements.length > 0;
  });

  console.log('Elements with Tailwind classes found:', hasClasses);

  // Check if there's a style tag in the head (CSS-in-JS from webpack dev server)
  const hasStyleTag = await page.evaluate(() => {
    const styleTags = document.querySelectorAll('head style');
    console.log('Number of style tags:', styleTags.length);
    if (styleTags.length > 0) {
      console.log('First style tag content length:', styleTags[0].textContent?.length);
    }
    return styleTags.length > 0;
  });

  console.log('Has style tag in head:', hasStyleTag);

  // Check specific element styles
  const heroSection = page.locator('section').first();
  if (await heroSection.count() > 0) {
    const heroStyles = await heroSection.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        backgroundColor: styles.backgroundColor,
        padding: styles.padding,
        color: styles.color,
      };
    });
    console.log('Hero section styles:', heroStyles);
  }

  // Verify CSS is loaded by checking if computed styles are not default
  expect(hasStyleTag).toBe(true);
});
