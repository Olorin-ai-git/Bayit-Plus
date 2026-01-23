import { test } from '@playwright/test';

test('debug full layout', async ({ page }) => {
  const logs: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') logs.push(`ERROR: ${msg.text()}`);
  });

  await page.goto('http://localhost:3000', { timeout: 60000 });
  await page.waitForTimeout(10000);

  // Take initial screenshot
  await page.screenshot({ path: '/tmp/layout-initial.png' });

  // Get page dimensions
  const dimensions = await page.evaluate(() => ({
    viewportHeight: window.innerHeight,
    scrollHeight: document.body.scrollHeight,
    mainContent: (() => {
      const main = document.querySelector('main, [class*="flex-1"], [class*="ScrollView"]');
      if (main) {
        const rect = main.getBoundingClientRect();
        return { width: rect.width, height: rect.height, top: rect.top };
      }
      return null;
    })(),
    allSections: (() => {
      const sections: any[] = [];
      document.querySelectorAll('[class*="mt-8"], [class*="mt-12"], [class*="my-4"]').forEach(el => {
        const rect = el.getBoundingClientRect();
        sections.push({
          top: rect.top,
          height: rect.height,
          class: el.className.substring(0, 50),
        });
      });
      return sections;
    })(),
  }));

  console.log('Page dimensions:', JSON.stringify(dimensions, null, 2));

  // Scroll down in steps and take screenshots
  for (let i = 0; i < 5; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), i * 500);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `/tmp/layout-scroll-${i}.png` });
    console.log(`Scroll ${i}: y=${i * 500}`);
  }

  // Get final state
  const finalState = await page.evaluate(() => {
    const contentAreas = document.querySelectorAll('[class*="carousel"], [class*="Carousel"], [class*="card"], [class*="Card"]');
    return {
      contentAreasCount: contentAreas.length,
      firstContentArea: contentAreas[0] ? {
        rect: contentAreas[0].getBoundingClientRect(),
        class: contentAreas[0].className.substring(0, 80),
      } : null,
    };
  });

  console.log('Final state:', JSON.stringify(finalState, null, 2));
  console.log('Console errors:', logs);
});
