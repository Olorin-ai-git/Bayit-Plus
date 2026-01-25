const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
  });

  try {
    await page.goto('http://localhost:3200/search', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    console.log('Console messages:');
    consoleMessages.forEach(msg => console.log(msg));

    // Check what's actually rendered
    const placeholder = await page.locator('input').first().getAttribute('placeholder');
    console.log('\nRendered placeholder:', placeholder);

  } catch (error) {
    console.error('Test error:', error.message);
  } finally {
    await browser.close();
  }
})();
