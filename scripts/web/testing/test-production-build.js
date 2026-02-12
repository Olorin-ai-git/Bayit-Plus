const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    console.log('Testing production build on http://localhost:3300/search?lng=en\n');

    await page.goto('http://localhost:3300/search?lng=en', {
      waitUntil: 'load',
      timeout: 30000
    });

    // Wait for React
    await page.waitForFunction(() => {
      const root = document.getElementById('root');
      return root && root.children.length > 0;
    }, { timeout: 10000 });

    await page.waitForTimeout(3000);

    // Check translations
    const result = await page.evaluate(() => {
      const placeholder = document.querySelector('input')?.placeholder || 'NO INPUT';
      const bodyText = document.body.innerText;

      return {
        inputPlaceholder: placeholder,
        hasRawKeys: {
          placeholder: bodyText.includes('search.controls.placeholder'),
          semantic: bodyText.includes('search.semantic.semantic'),
          categories: bodyText.includes('search.suggestions.categoriesTitle'),
        },
        hasTranslations: {
          searchForContent: bodyText.includes('Search for content'),
          categories: bodyText.includes('Categories'),
          semantic: bodyText.includes('Semantic'),
        },
        language: document.documentElement.lang,
        direction: document.documentElement.dir,
      };
    });

    console.log('=== PRODUCTION BUILD TEST RESULTS ===\n');
    console.log('Language:', result.language);
    console.log('Direction:', result.direction);
    console.log('\nInput Placeholder:', result.inputPlaceholder);

    console.log('\nUntranslated Keys (should be false):');
    console.log('  controls.placeholder:', result.hasRawKeys.placeholder ? '❌ FOUND' : '✅ NOT FOUND');
    console.log('  semantic.semantic:', result.hasRawKeys.semantic ? '❌ FOUND' : '✅ NOT FOUND');
    console.log('  suggestions.categoriesTitle:', result.hasRawKeys.categories ? '❌ FOUND' : '✅ NOT FOUND');

    console.log('\nEnglish Translations (should be true):');
    console.log('  "Search for content":', result.hasTranslations.searchForContent ? '✅ FOUND' : '❌ NOT FOUND');
    console.log('  "Categories":', result.hasTranslations.categories ? '✅ FOUND' : '❌ NOT FOUND');
    console.log('  "Semantic":', result.hasTranslations.semantic ? '✅ FOUND' : '❌ NOT FOUND');

    const noRawKeys = !Object.values(result.hasRawKeys).some(v => v);
    const allTranslations = Object.values(result.hasTranslations).every(v => v);
    const placeholderCorrect = result.inputPlaceholder.includes('Search for content');

    console.log('\n=== OVERALL STATUS ===');
    if (noRawKeys && allTranslations && placeholderCorrect) {
      console.log('✅ SUCCESS: Production build - all translations working perfectly!');
    } else {
      console.log('❌ FAILURE: Some translations missing');
      console.log('  No raw keys:', noRawKeys);
      console.log('  All translations:', allTranslations);
      console.log('  Placeholder correct:', placeholderCorrect);
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
