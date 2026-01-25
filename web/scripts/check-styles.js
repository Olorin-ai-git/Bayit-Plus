import { chromium } from 'playwright';

async function checkStyles() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://localhost:3200/subscribe', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Find the hero title
  const heroTitle = await page.$('text=בחר את המסלול שלך');

  if (heroTitle) {
    const styles = await heroTitle.evaluate(el => {
      const computed = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return {
        color: computed.color,
        backgroundColor: computed.backgroundColor,
        fontSize: computed.fontSize,
        display: computed.display,
        visibility: computed.visibility,
        opacity: computed.opacity,
        position: computed.position,
        zIndex: computed.zIndex,
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      };
    });
    console.log('Hero title styles:', styles);
  }

  // Check the background gradient
  const gradient = await page.$('[class*="backgroundGradient"]');
  if (gradient) {
    const gradientStyles = await gradient.evaluate(el => {
      const computed = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return {
        position: computed.position,
        zIndex: computed.zIndex,
        top: rect.top,
        height: rect.height,
        backgroundColor: computed.backgroundColor,
      };
    });
    console.log('\nBackground gradient styles:', gradientStyles);
  }

  // Check main container
  const contentContainer = await page.$('[class*="contentContainer"]');
  if (contentContainer) {
    const containerStyles = await contentContainer.evaluate(el => {
      const computed = window.getComputedStyle(el);
      return {
        position: computed.position,
        zIndex: computed.zIndex,
        maxWidth: computed.maxWidth,
        paddingTop: computed.paddingTop,
        backgroundColor: computed.backgroundColor,
      };
    });
    console.log('\nContent container styles:', containerStyles);
  }

  // Take a screenshot with highlights
  await page.evaluate(() => {
    // Highlight the hero section
    const hero = document.querySelector('[class*="hero"]');
    if (hero) {
      hero.style.border = '5px solid red';
    }
  });

  await page.screenshot({ path: 'subscribe-highlighted.png', fullPage: true });
  console.log('\nScreenshot with highlights saved to subscribe-highlighted.png');

  await browser.close();
}

checkStyles();
