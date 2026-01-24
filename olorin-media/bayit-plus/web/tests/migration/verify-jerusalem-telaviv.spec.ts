import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const screenshotsDir = path.join(__dirname, '..', 'screenshots', 'sections');

const LOCAL_URL = 'http://localhost:3200';

test.describe('Verify Jerusalem and Tel Aviv Sections', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage
    await page.goto(LOCAL_URL);
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('Capture Jerusalem section', async ({ page }) => {
    await page.goto(`${LOCAL_URL}/?lng=en`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    // Find and scroll to Jerusalem section
    const jerusalemSection = await page.locator('text=/Jerusalem|ירושלים/i').first();
    await jerusalemSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);

    // Get bounding box and capture viewport screenshot
    const box = await jerusalemSection.boundingBox();
    console.log('Jerusalem section position:', box);

    await page.screenshot({
      path: path.join(screenshotsDir, 'local-jerusalem-viewport.png'),
    });
  });

  test('Capture Tel Aviv section', async ({ page }) => {
    await page.goto(`${LOCAL_URL}/?lng=en`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    // Find and scroll to Tel Aviv section
    const telAvivSection = await page.locator('text=/Tel Aviv|תל אביב/i').first();
    await telAvivSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);

    // Get bounding box and capture viewport screenshot
    const box = await telAvivSection.boundingBox();
    console.log('Tel Aviv section position:', box);

    await page.screenshot({
      path: path.join(screenshotsDir, 'local-telaviv-viewport.png'),
    });
  });
});
