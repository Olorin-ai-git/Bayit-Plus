const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:3200/search', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Inject script to check i18next resources
    const diagnostics = await page.evaluate(() => {
      // Try to get i18next from various possible locations
      const i18n = window.i18next ||
                   window.i18n ||
                   (window.__i18next__ && window.__i18next__.i18next);

      if (!i18n) {
        return { error: 'i18next not accessible' };
      }

      const language = i18n.language;
      const store = i18n.store;
      const data = store?.data || {};
      const langData = data[language] || {};
      const translation = langData.translation || {};

      return {
        language,
        hasStore: !!store,
        hasLangData: Object.keys(langData).length > 0,
        namespaces: Object.keys(langData),
        topLevelKeys: Object.keys(translation).slice(0, 20),
        hasSearchKey: 'search' in translation,
        searchType: typeof translation.search,
        searchKeys: translation.search ? Object.keys(translation.search).slice(0, 10) : null,
        testLookup: i18n.t('search.controls.placeholder'),
        testExists: i18n.exists('search.controls.placeholder'),
      };
    });

    console.log('i18next Diagnostics:');
    console.log(JSON.stringify(diagnostics, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
