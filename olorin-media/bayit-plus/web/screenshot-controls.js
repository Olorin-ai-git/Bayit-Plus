import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Navigate to a live channel player page
  await page.goto('http://localhost:3000/live/6963bff4abb3ca055cdd8474', {
    waitUntil: 'networkidle',
    timeout: 60000
  });

  // Wait for player to load
  await page.waitForTimeout(3000);

  // Take screenshot of collapsed state
  await page.screenshot({
    path: '/tmp/controls-collapsed.png',
    fullPage: false
  });

  // Click Language Settings button to expand
  const langButton = await page.locator('text=Language Settings').first();
  if (await langButton.isVisible()) {
    await langButton.click();
    await page.waitForTimeout(500);

    // Take screenshot of expanded state
    await page.screenshot({
      path: '/tmp/controls-expanded.png',
      fullPage: false
    });
  }

  await browser.close();
  console.log('Screenshots saved to /tmp/controls-collapsed.png and /tmp/controls-expanded.png');
})();
