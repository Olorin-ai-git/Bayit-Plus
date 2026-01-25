import { chromium } from 'playwright';

async function quickDebug() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const errors = [];
  const consoleMessages = [];

  page.on('console', msg => consoleMessages.push(`${msg.type()}: ${msg.text()}`));
  page.on('pageerror', error => errors.push(error.message));

  await page.goto('http://localhost:3200/subscribe', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Get page HTML
  const html = await page.content();

  // Check if Subscribe page content is there
  const hasSubscribeContent = html.includes('Choose Your Plan') || html.includes('subscribe');

  console.log('=== DEBUG RESULTS ===');
  console.log('Has subscribe content:', hasSubscribeContent);
  console.log('\nConsole messages:', consoleMessages.length);
  consoleMessages.forEach(msg => console.log('  -', msg));
  console.log('\nErrors:', errors.length);
  errors.forEach(err => console.log('  -', err));

  // Check specific elements
  const heroExists = await page.$('text=Choose Your Plan');
  const planCardsExist = await page.$$('[class*="EnhancedPlanCard"]');

  console.log('\nHero text found:', !!heroExists);
  console.log('Plan cards found:', planCardsExist.length);

  // Get body background color
  const bgColor = await page.evaluate(() => {
    return window.getComputedStyle(document.body).backgroundColor;
  });
  console.log('Body background color:', bgColor);

  await browser.close();
}

quickDebug();
