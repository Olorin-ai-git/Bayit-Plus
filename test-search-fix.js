const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Navigate to search page
    await page.goto('http://localhost:3200/search', { waitUntil: 'networkidle' });

    // Wait a bit for any dynamic content
    await page.waitForTimeout(2000);

    // Capture screenshot
    await page.screenshot({
      path: 'web/tests/screenshots/comprehensive-parity/local-search-fix-test.png',
      fullPage: true
    });

    // Check for translation keys (should NOT be present)
    const bodyText = await page.textContent('body');
    const hasUntranslatedKeys =
      bodyText.includes('controls.placeholder') ||
      bodyText.includes('semantic.semantic') ||
      bodyText.includes('suggestions.categoriesTitle');

    if (hasUntranslatedKeys) {
      console.log('❌ FAILED: Untranslated keys still present');
    } else {
      console.log('✅ SUCCESS: All translations loaded correctly');
    }

  } catch (error) {
    console.error('Test error:', error.message);
  } finally {
    await browser.close();
  }
})();
