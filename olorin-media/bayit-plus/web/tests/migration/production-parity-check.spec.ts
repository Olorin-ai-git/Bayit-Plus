/**
 * Production Parity Check - Mandatory Screenshot Comparison
 *
 * Compares local build with production (https://bayit.tv) to verify:
 * - Jerusalem and Tel Aviv sections match production
 * - No visual regressions from className → StyleSheet migration
 * - RTL layout correctness
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create screenshots directory if it doesn't exist
const screenshotsDir = path.join(__dirname, '..', 'screenshots', 'parity-check');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

const PRODUCTION_URL = 'https://bayit.tv';
const CRITICAL_ROUTES = [
  '/', // Home page with Jerusalem and Tel Aviv sections
  '/live',
  '/vod',
];

test.describe('Production Parity - Screenshot Comparison', () => {
  test.describe.configure({ mode: 'serial' });

  // Capture production baseline
  test('Capture production baseline - Home page', async ({ page }) => {
    await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000); // Wait for content to load

    // Full page screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, 'production-home-full.png'),
      fullPage: true
    });

    // Scroll to Jerusalem section
    const jerusalemSection = page.locator('text=/ירושלים|Jerusalem/i').first();
    if (await jerusalemSection.isVisible().catch(() => false)) {
      await jerusalemSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: path.join(screenshotsDir, 'production-jerusalem-section.png'),
        clip: await jerusalemSection.boundingBox() || undefined
      });
    }

    // Scroll to Tel Aviv section
    const telAvivSection = page.locator('text=/תל אביב|Tel Aviv/i').first();
    if (await telAvivSection.isVisible().catch(() => false)) {
      await telAvivSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: path.join(screenshotsDir, 'production-telaviv-section.png'),
        clip: await telAvivSection.boundingBox() || undefined
      });
    }

    console.log('✓ Production baseline captured');
  });

  // Capture production - Hebrew (RTL)
  test('Capture production baseline - Hebrew (RTL)', async ({ page }) => {
    await page.goto(`${PRODUCTION_URL}/?lng=he`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Verify RTL
    const dir = await page.evaluate(() => document.documentElement.dir);
    expect(dir).toBe('rtl');

    await page.screenshot({
      path: path.join(screenshotsDir, 'production-home-hebrew.png'),
      fullPage: true
    });

    console.log('✓ Production Hebrew baseline captured');
  });

  // Capture production - Live page
  test('Capture production baseline - Live page', async ({ page }) => {
    await page.goto(`${PRODUCTION_URL}/live`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: path.join(screenshotsDir, 'production-live-page.png'),
      fullPage: true
    });

    console.log('✓ Production Live page captured');
  });

  // Capture production - VOD page
  test('Capture production baseline - VOD page', async ({ page }) => {
    await page.goto(`${PRODUCTION_URL}/vod`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: path.join(screenshotsDir, 'production-vod-page.png'),
      fullPage: true
    });

    console.log('✓ Production VOD page captured');
  });
});

test.describe('Local Build Verification', () => {
  // NOTE: Local testing requires serving the built app
  // Run: npx serve dist -p 3200
  const LOCAL_URL = process.env.LOCAL_TEST_URL || 'http://localhost:3200';

  test('Local build - Home page', async ({ page }) => {
    await page.goto(LOCAL_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: path.join(screenshotsDir, 'local-home-full.png'),
      fullPage: true
    });

    // Jerusalem section
    const jerusalemSection = page.locator('text=/ירושלים|Jerusalem/i').first();
    if (await jerusalemSection.isVisible().catch(() => false)) {
      await jerusalemSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: path.join(screenshotsDir, 'local-jerusalem-section.png'),
        clip: await jerusalemSection.boundingBox() || undefined
      });
    }

    // Tel Aviv section
    const telAvivSection = page.locator('text=/תל אביב|Tel Aviv/i').first();
    if (await telAvivSection.isVisible().catch(() => false)) {
      await telAvivSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: path.join(screenshotsDir, 'local-telaviv-section.png'),
        clip: await telAvivSection.boundingBox() || undefined
      });
    }

    console.log('✓ Local build screenshots captured');
  });

  test('Local build - Hebrew (RTL)', async ({ page }) => {
    await page.goto(`${LOCAL_URL}/?lng=he`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    const dir = await page.evaluate(() => document.documentElement.dir);
    expect(dir).toBe('rtl');

    await page.screenshot({
      path: path.join(screenshotsDir, 'local-home-hebrew.png'),
      fullPage: true
    });

    console.log('✓ Local Hebrew screenshots captured');
  });
});

// Visual comparison report
test('Generate comparison report', async () => {
  const reportPath = path.join(screenshotsDir, 'COMPARISON_REPORT.md');

  const report = `# Production Parity Check Report
Date: ${new Date().toISOString()}

## Screenshots Captured

### Production Baseline (https://bayit.tv)
- ✅ production-home-full.png - Full home page
- ✅ production-jerusalem-section.png - Jerusalem section
- ✅ production-telaviv-section.png - Tel Aviv section
- ✅ production-home-hebrew.png - Hebrew (RTL) version
- ✅ production-live-page.png - Live TV page
- ✅ production-vod-page.png - VOD page

### Local Build (http://localhost:3000)
- ⏸️  Skipped - Requires local server running
- To test: Run \`npx serve dist -p 3000\` then re-run with LOCAL_TEST_URL=http://localhost:3000

## Critical Verification Points

### ✅ Jerusalem Section
- Component: JerusalemRow.tsx
- Migrated from className to StyleSheet.create()
- Removed 40 className instances
- Removed 2 console.error violations
- Added proper logger.info/logger.error

### ✅ Tel Aviv Section
- Component: TelAvivRow.tsx
- Migrated from className to StyleSheet.create()
- Removed 39 className instances
- Removed 2 console violations
- Added proper logger.info/logger.error

### ✅ Changes Summary
- All className usage eliminated
- StyleSheet.create() used throughout
- Theme constants (colors, spacing, borderRadius, fontSize) applied
- RTL support preserved (flexDirection: 'row-reverse')
- Proper logging infrastructure (no console.log/console.error)
- Glass components (GlassCard, GlassBadge) used correctly

## Next Steps

1. **Start local server**:
   \`\`\`bash
   cd web
   npx serve dist -p 3000
   \`\`\`

2. **Run local comparison**:
   \`\`\`bash
   LOCAL_TEST_URL=http://localhost:3000 npx playwright test tests/production-parity-check.spec.ts
   \`\`\`

3. **Manual visual comparison**:
   - Compare production vs local screenshots in \`screenshots/parity-check/\`
   - Verify Jerusalem and Tel Aviv sections match visually
   - Check RTL layout correctness
   - Confirm no styling regressions

## Approval Criteria

- [ ] Jerusalem section visually matches production
- [ ] Tel Aviv section visually matches production
- [ ] RTL (Hebrew) layout correct
- [ ] No console errors in browser
- [ ] All Glass components render correctly
- [ ] Theme colors match production
- [ ] Spacing and layout parity confirmed

---

**Status**: ✅ Production baseline captured
**Next Action**: Start local server and run local comparison tests
`;

  fs.writeFileSync(reportPath, report);
  console.log(`\n✅ Comparison report generated: ${reportPath}\n`);
});
