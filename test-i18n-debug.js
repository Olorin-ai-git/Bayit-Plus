const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:3200/search', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Execute JavaScript in the browser context to check i18next
    const i18nInfo = await page.evaluate(() => {
      // Access i18next from the window object
      const i18n = window.i18n || window.i18next;

      if (!i18n) {
        return { error: 'i18next not found on window object' };
      }

      return {
        language: i18n.language,
        namespaces: i18n.options?.ns || [],
        defaultNS: i18n.options?.defaultNS,
        hasTranslation: i18n.exists('search.controls.placeholder'),
        directLookup: i18n.t('search.controls.placeholder'),
        resourceKeys: Object.keys(i18n.store?.data?.en?.translation || {}),
        hasSearchKey: 'search' in (i18n.store?.data?.en?.translation || {}),
      };
    });

    console.log('i18next Configuration:');
    console.log(JSON.stringify(i18nInfo, null, 2));

  } catch (error) {
    console.error('Test error:', error.message);
  } finally {
    await browser.close();
  }
})();
