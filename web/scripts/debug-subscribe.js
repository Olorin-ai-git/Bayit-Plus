import { chromium } from 'playwright';

async function debugSubscribePage() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  // Listen for console messages
  page.on('console', msg => {
    console.log(`BROWSER ${msg.type()}: ${msg.text()}`);
  });

  // Listen for errors
  page.on('pageerror', error => {
    console.log(`PAGE ERROR: ${error.message}`);
  });

  try {
    console.log('Navigating to subscribe page...');
    await page.goto('http://localhost:3200/subscribe', { waitUntil: 'networkidle' });

    await page.waitForTimeout(2000);

    // Check if main content exists
    const contentContainer = await page.$('[class*="contentContainer"]');
    console.log('Content container found:', !!contentContainer);

    // Check for hero section
    const hero = await page.$('[class*="hero"]');
    console.log('Hero section found:', !!hero);

    // Check for plan cards
    const planCards = await page.$$('[class*="card"]');
    console.log('Plan cards found:', planCards.length);

    // Get computed styles of content container
    if (contentContainer) {
      const styles = await contentContainer.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          display: computed.display,
          visibility: computed.visibility,
          opacity: computed.opacity,
          zIndex: computed.zIndex,
          position: computed.position,
          color: computed.color,
          backgroundColor: computed.backgroundColor,
        };
      });
      console.log('Content container styles:', styles);
    }

    // Take screenshot
    await page.screenshot({ path: 'debug-subscribe.png', fullPage: true });
    console.log('Debug screenshot saved');

    // Keep browser open for inspection
    console.log('Browser open for inspection. Press Ctrl+C to close.');
    await page.waitForTimeout(300000); // 5 minutes

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

debugSubscribePage();
