const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:3200/search?lng=en', { waitUntil: 'load', timeout: 30000 });

    // Wait for React to render
    await page.waitForFunction(() => {
      const root = document.getElementById('root');
      return root && root.children.length > 0;
    }, { timeout: 10000 });

    await page.waitForTimeout(3000);

    // Check for untranslated keys vs translated content
    const content = await page.evaluate(() => {
      const bodyText = document.body.innerText;

      return {
        // Check for untranslated keys (these should NOT be present)
        hasUntranslatedKeys: {
          placeholder: bodyText.includes('search.controls.placeholder') || bodyText.includes('controls.placeholder'),
          semantic: bodyText.includes('search.semantic.semantic') || bodyText.includes('semantic.semantic'),
          categories: bodyText.includes('search.suggestions.categoriesTitle') || bodyText.includes('suggestions.categoriesTitle'),
        },

        // Check for actual English translations (these SHOULD be present)
        hasEnglishTranslations: {
          searchPlaceholder: bodyText.includes('Search for content'),
          categories: bodyText.includes('Categories'),
          semantic: bodyText.includes('Semantic'),
        },

        // Get input placeholder directly
        inputPlaceholder: document.querySelector('input')?.placeholder || 'NO INPUT FOUND',

        // Sample of body text
        bodyTextSample: bodyText.substring(0, 500),
      };
    });

    console.log('\n=== Search Page i18n Verification ===\n');

    console.log('Untranslated Keys Check (should all be false):');
    console.log('  controls.placeholder:', content.hasUntranslatedKeys.placeholder ? '❌ FOUND' : '✅ NOT FOUND');
    console.log('  semantic.semantic:', content.hasUntranslatedKeys.semantic ? '❌ FOUND' : '✅ NOT FOUND');
    console.log('  suggestions.categoriesTitle:', content.hasUntranslatedKeys.categories ? '❌ FOUND' : '✅ NOT FOUND');

    console.log('\nEnglish Translations Check (should all be true):');
    console.log('  "Search for content":', content.hasEnglishTranslations.searchPlaceholder ? '✅ FOUND' : '❌ NOT FOUND');
    console.log('  "Categories":', content.hasEnglishTranslations.categories ? '✅ FOUND' : '❌ NOT FOUND');
    console.log('  "Semantic":', content.hasEnglishTranslations.semantic ? '✅ FOUND' : '❌ NOT FOUND');

    console.log('\nInput Placeholder:', content.inputPlaceholder);

    // Overall status
    const hasAnyUntranslated = Object.values(content.hasUntranslatedKeys).some(v => v);
    const hasAllTranslations = Object.values(content.hasEnglishTranslations).every(v => v);

    console.log('\n=== Overall Status ===');
    if (!hasAnyUntranslated && hasAllTranslations) {
      console.log('✅ SUCCESS: All translations working correctly');
    } else {
      console.log('❌ FAILURE: Translation issues detected');
    }

    console.log('\nBody Text Sample:');
    console.log(content.bodyTextSample);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
