const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Clear all cache
    await context.clearCookies();

    // Navigate with cache busting
    const cacheBuster = Date.now();
    await page.goto(`http://localhost:3200/search?lng=en&_=${cacheBuster}`, {
      waitUntil: 'load',
      timeout: 30000
    });

    // Wait for React
    await page.waitForFunction(() => {
      const root = document.getElementById('root');
      return root && root.children.length > 0;
    }, { timeout: 10000 });

    await page.waitForTimeout(5000);

    // Check translations
    const result = await page.evaluate(() => {
      const placeholder = document.querySelector('input')?.placeholder || 'NO INPUT';
      const bodyText = document.body.innerText;

      return {
        inputPlaceholder: placeholder,
        hasSearchForContent: bodyText.includes('Search for content'),
        hasSemanticKey: bodyText.includes('search.semantic.semantic'),
        bodyTextSample: bodyText.substring(0, 400),
      };
    });

    console.log('\n=== Cache-Busted Test ===\n');
    console.log('Input Placeholder:', result.inputPlaceholder);
    console.log('Has "Search for content":', result.hasSearchForContent);
    console.log('Has untranslated "search.semantic.semantic":', result.hasSemanticKey);

    if (result.inputPlaceholder.includes('Search for content')) {
      console.log('\n✅ SUCCESS: Translations are working!');
    } else {
      console.log('\n❌ FAILURE: Still showing untranslated key');
    }

    console.log('\nBody sample:');
    console.log(result.bodyTextSample);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
