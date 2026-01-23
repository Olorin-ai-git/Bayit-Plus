import { test } from '@playwright/test';

test('debug content sections', async ({ page }) => {
  // Capture console errors
  const errors: string[] = [];
  const logs: string[] = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    } else if (msg.type() === 'log' || msg.type() === 'info') {
      logs.push(`[${msg.type()}] ${msg.text()}`);
    }
  });
  page.on('pageerror', err => {
    errors.push(`PAGE ERROR: ${err.message}`);
  });

  // Track API responses
  const apiResponses: any[] = [];
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('/api/')) {
      const status = response.status();
      let body = null;
      try {
        body = await response.json();
      } catch { /* not JSON */ }
      apiResponses.push({ url, status, body: body ? JSON.stringify(body).substring(0, 500) : null });
    }
  });

  await page.goto('http://localhost:3000');
  await page.waitForTimeout(5000);

  console.log('\n=== Console Errors ===');
  errors.forEach(e => console.log(e));

  console.log('\n=== API Responses ===');
  apiResponses.forEach(r => console.log(`${r.status} ${r.url}\n${r.body || ''}\n`));

  // Find all content sections with titles
  const sections = await page.evaluate(() => {
    const results: any[] = [];

    // Find all section titles (text elements with "text-xl font-bold")
    const sectionTitles = document.querySelectorAll('[class*="text-xl"][class*="font-bold"]');

    sectionTitles.forEach((titleEl) => {
      const title = titleEl.textContent?.trim() || 'Unknown';
      const parent = titleEl.closest('[class*="max-w-"]') || titleEl.parentElement?.parentElement?.parentElement;

      if (parent) {
        const rect = parent.getBoundingClientRect();
        const scrollViews = parent.querySelectorAll('[class*="scroll"], [data-rnw-int-class*="scroll"]');
        const images = parent.querySelectorAll('img');

        // Get image info
        const imageInfo = Array.from(images).slice(0, 3).map((img: any) => ({
          src: img.src?.substring(0, 80),
          width: img.width,
          height: img.height,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
        }));

        results.push({
          title,
          rect: { width: rect.width, height: rect.height, top: rect.top },
          imageCount: images.length,
          imageInfo,
          hasScrollView: scrollViews.length > 0,
        });
      }
    });

    return results;
  });

  console.log('\n=== Content Sections ===');
  sections.forEach((section) => {
    console.log(`\n${section.title}:`);
    console.log(`  Size: ${section.rect.width}x${section.rect.height}, Top: ${section.rect.top}`);
    console.log(`  Images: ${section.imageCount}, HasScrollView: ${section.hasScrollView}`);
    if (section.imageInfo.length > 0) {
      section.imageInfo.forEach((img: any, i: number) => {
        console.log(`  Image ${i + 1}: ${img.width}x${img.height} (natural: ${img.naturalWidth}x${img.naturalHeight})`);
        console.log(`    src: ${img.src}`);
      });
    }
  });

  // Check for any visible content cards
  const cards = await page.evaluate(() => {
    const cardElements = document.querySelectorAll('[class*="card"], [class*="Card"]');
    return Array.from(cardElements).slice(0, 5).map((el) => {
      const rect = el.getBoundingClientRect();
      return {
        className: el.className.substring(0, 80),
        rect: { width: rect.width, height: rect.height },
        visible: rect.height > 10,
      };
    });
  });

  console.log('\n=== Content Cards ===');
  cards.forEach((card, i) => console.log(`Card ${i + 1}: ${card.rect.width}x${card.rect.height}, Visible: ${card.visible}`));

  // Take full page screenshot
  await page.screenshot({ path: '/tmp/homepage-full.png', fullPage: true });

  // Take viewport screenshot
  await page.screenshot({ path: '/tmp/homepage-viewport.png' });

  console.log('\n=== Screenshots saved ===');
  console.log('/tmp/homepage-full.png (full page)');
  console.log('/tmp/homepage-viewport.png (viewport only)');
});
