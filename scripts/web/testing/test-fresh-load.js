const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    // Disable cache
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  try {
    // Clear any existing cache
    await context.clearCookies();

    // Navigate with cache busting
    await page.goto(`http://localhost:3200/search?_=${Date.now()}`, {
      waitUntil: 'networkidle'
    });

    // Force reload
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Capture screenshot
    await page.screenshot({
      path: 'web/tests/screenshots/comprehensive-parity/local-search-fresh-load.png',
      fullPage: true
    });

    // Check for untranslated keys
    const bodyText = await page.textContent('body');
    const hasUntranslated =
      bodyText.includes('search.controls.placeholder') ||
      bodyText.includes('search.semantic.semantic') ||
      bodyText.includes('search.suggestions.categoriesTitle');

    const placeholder = await page.locator('input').first().getAttribute('placeholder');

    console.log('Placeholder:', placeholder);
    console.log(hasUntranslated ? '❌ FAILED: Still has untranslated keys' : '✅ SUCCESS: All translations working');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
