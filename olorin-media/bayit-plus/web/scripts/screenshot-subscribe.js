import { chromium } from 'playwright';

async function captureSubscribePage() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  try {
    console.log('Navigating to subscribe page...');
    await page.goto('http://localhost:3200/subscribe', { waitUntil: 'networkidle' });

    // Wait a bit for any animations
    await page.waitForTimeout(2000);

    // Take full page screenshot
    console.log('Taking full page screenshot...');
    await page.screenshot({
      path: 'subscribe-fullpage.png',
      fullPage: true
    });

    // Take viewport screenshot
    console.log('Taking viewport screenshot...');
    await page.screenshot({
      path: 'subscribe-viewport.png'
    });

    // Take screenshot of plan cards section
    const plansSection = await page.$('.plansGrid, [class*="plansGrid"]');
    if (plansSection) {
      await plansSection.screenshot({ path: 'subscribe-cards.png' });
    }

    // Take screenshot of comparison table
    const comparisonTable = await page.$('[role="table"]');
    if (comparisonTable) {
      await comparisonTable.screenshot({ path: 'subscribe-comparison.png' });
    }

    console.log('Screenshots saved successfully!');
    console.log('- subscribe-fullpage.png');
    console.log('- subscribe-viewport.png');
    console.log('- subscribe-cards.png (if found)');
    console.log('- subscribe-comparison.png (if found)');

  } catch (error) {
    console.error('Error capturing screenshots:', error);
  } finally {
    await browser.close();
  }
}

captureSubscribePage();
