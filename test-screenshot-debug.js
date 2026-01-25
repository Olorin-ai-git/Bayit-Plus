const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false }); // NON-headless to see what's happening
  const page = await browser.newPage();

  try {
    console.log('Navigating to search page...');
    await page.goto('http://localhost:3200/search?lng=en', { waitUntil: 'load', timeout: 30000 });

    console.log('Waiting for React root...');
    await page.waitForFunction(() => {
      const root = document.getElementById('root');
      return root && root.children.length > 0;
    }, { timeout: 10000 });

    console.log('Waiting additional 3 seconds...');
    await page.waitForTimeout(3000);

    // Check what's actually rendered
    const bodyHTML = await page.evaluate(() => {
      return {
        rootChildren: document.getElementById('root')?.children.length || 0,
        bodyText: document.body.innerText.substring(0, 200),
        hasSearchInput: !!document.querySelector('input'),
        backgroundColor: getComputedStyle(document.body).backgroundColor,
      };
    });

    console.log('Page content check:', bodyHTML);

    // Take screenshot
    await page.screenshot({
      path: '/tmp/search-debug.png',
      fullPage: true
    });

    console.log('Screenshot saved to /tmp/search-debug.png');

    // Keep browser open for manual inspection
    console.log('Browser will stay open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
