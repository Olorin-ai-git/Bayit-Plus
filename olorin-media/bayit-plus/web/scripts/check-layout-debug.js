import { chromium } from 'playwright';

async function checkLayout() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto('http://localhost:3200/subscribe', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  // Check ScrollView
  const scrollView = await page.$$('[data-testid], [style*="overflow"]');
  console.log('ScrollView elements found:', scrollView.length);
  
  // Get content wrapper dimensions
  const dimensions = await page.evaluate(() => {
    const body = document.body;
    const root = document.getElementById('root');
    const scrollViews = document.querySelectorAll('[style*="flex"]');
    
    return {
      body: { width: body.offsetWidth, height: body.offsetHeight },
      root: root ? { width: root.offsetWidth, height: root.offsetHeight } : null,
      scrollViewCount: scrollViews.length,
      firstScrollView: scrollViews[0] ? {
        width: scrollViews[0].offsetWidth,
        height: scrollViews[0].offsetHeight,
        styles: window.getComputedStyle(scrollViews[0]).cssText
      } : null
    };
  });
  
  console.log('Layout dimensions:', JSON.stringify(dimensions, null, 2));
  
  await browser.close();
}

checkLayout();
