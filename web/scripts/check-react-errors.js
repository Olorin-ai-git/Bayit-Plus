import { chromium } from 'playwright';

async function checkReactErrors() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const errors = [];
  const warnings = [];

  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') {
      errors.push(text);
    } else if (msg.type() === 'warning' && (text.includes('React') || text.includes('component'))) {
      warnings.push(text);
    }
  });

  page.on('pageerror', error => {
    errors.push(`PAGE ERROR: ${error.message}\n${error.stack}`);
  });

  await page.goto('http://localhost:3200/subscribe', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Check if ScrollView is rendering
  const scrollView = await page.$('div[style*="overflow"]');
  console.log('ScrollView found:', !!scrollView);

  // Check React root
  const reactRoot = await page.$('#root');
  if (reactRoot) {
    const rootHTML = await reactRoot.innerHTML();
    console.log('Root has content:', rootHTML.length > 100);
    console.log('Root HTML length:', rootHTML.length);
  }

  // Try to find any subscribe-related content
  const allText = await page.evaluate(() => document.body.innerText);
  console.log('\nPage text content:', allText.substring(0, 500));

  console.log('\n=== ERRORS ===');
  if (errors.length > 0) {
    errors.forEach(err => console.log(err));
  } else {
    console.log('No errors found');
  }

  console.log('\n=== WARNINGS ===');
  if (warnings.length > 0) {
    warnings.forEach(warn => console.log(warn));
  } else {
    console.log('No React warnings found');
  }

  await browser.close();
}

checkReactErrors();
