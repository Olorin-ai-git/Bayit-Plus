import { test } from '@playwright/test';

test('verify full page content', async ({ page }) => {
  await page.goto('http://localhost:3000', { timeout: 60000 });

  // Wait for content to load
  await page.waitForTimeout(10000);

  // Take viewport screenshot
  await page.screenshot({ path: '/tmp/verify-viewport.png' });

  // Get page height
  const pageHeight = await page.evaluate(() => document.body.scrollHeight);
  console.log('Page height:', pageHeight);

  // Take full page screenshot
  await page.screenshot({ path: '/tmp/verify-fullpage.png', fullPage: true });

  // Get all section titles
  const sections = await page.evaluate(() => {
    const results: string[] = [];
    const textNodes = document.evaluate(
      "//text()[normalize-space()]",
      document.body,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    );

    for (let i = 0; i < textNodes.snapshotLength; i++) {
      const node = textNodes.snapshotItem(i);
      if (node && node.parentElement) {
        const el = node.parentElement;
        const rect = el.getBoundingClientRect();
        const computed = window.getComputedStyle(el);
        const fontSize = parseFloat(computed.fontSize);
        const fontWeight = computed.fontWeight;

        // Look for bold text that might be section titles
        if ((parseInt(fontWeight) >= 600 || fontWeight === 'bold') &&
            fontSize >= 16 &&
            node.textContent &&
            node.textContent.length < 50 &&
            rect.width > 50) {
          const text = node.textContent.trim();
          if (text && !results.includes(text)) {
            results.push(text);
          }
        }
      }
    }
    return results;
  });

  console.log('Section titles found:', sections);

  // Scroll through the page and count content sections
  const contentSections = await page.evaluate(() => {
    const sections: any[] = [];
    let currentY = 0;
    const step = 500;
    const maxScroll = document.body.scrollHeight;

    while (currentY < maxScroll) {
      window.scrollTo(0, currentY);

      // Find all horizontal scrollable containers (carousels)
      document.querySelectorAll('[data-rnw-int-class*="scroll"], [class*="overflow-x"]').forEach(el => {
        const rect = el.getBoundingClientRect();
        const parent = el.parentElement;

        // Count child elements (content items)
        const children = el.children.length;

        if (rect.height > 50 && children > 0) {
          // Try to get the section title from parent
          let title = 'Unknown';
          if (parent) {
            const titleEl = parent.querySelector('[class*="text-xl"], [class*="font-bold"]');
            if (titleEl) title = titleEl.textContent?.substring(0, 40) || 'Unknown';
          }

          sections.push({
            y: currentY + rect.top,
            title,
            itemCount: children,
            height: rect.height,
          });
        }
      });

      currentY += step;
    }

    // Deduplicate
    const unique: any[] = [];
    sections.forEach(s => {
      if (!unique.find(u => Math.abs(u.y - s.y) < 100)) {
        unique.push(s);
      }
    });

    return unique;
  });

  console.log('Content sections:', JSON.stringify(contentSections, null, 2));

  // Scroll back to top
  await page.evaluate(() => window.scrollTo(0, 0));

  console.log('Screenshots saved to /tmp/verify-viewport.png and /tmp/verify-fullpage.png');
});
