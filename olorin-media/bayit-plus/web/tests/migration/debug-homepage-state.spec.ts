import { test } from '@playwright/test';

test('debug homepage state', async ({ page }) => {
  // Capture console
  const logs: string[] = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));

  await page.goto('http://localhost:3000', { timeout: 60000 });
  await page.waitForTimeout(8000);

  // Check for specific elements
  const pageState = await page.evaluate(() => {
    const state: any = {
      loadingText: [],
      sectionTitles: [],
      carouselImages: [],
      contentCards: [],
      categories: [],
      errors: [],
    };

    // Find all "Loading" text elements
    const allText = document.body.innerText;
    if (allText.includes('Loading')) {
      state.loadingText.push('Found "Loading" text on page');
    }

    // Find section titles (text elements with font-bold)
    document.querySelectorAll('*').forEach(el => {
      if (el.textContent && el.classList.contains('font-bold') && el.textContent.length < 50) {
        const text = el.textContent.trim();
        if (text && !state.sectionTitles.includes(text)) {
          state.sectionTitles.push(text);
        }
      }
    });

    // Find carousel images
    document.querySelectorAll('img').forEach((img, i) => {
      const rect = img.getBoundingClientRect();
      if (rect.width > 100 && rect.height > 100) {
        state.carouselImages.push({
          index: i,
          src: img.src?.substring(0, 100),
          size: `${rect.width}x${rect.height}`,
          loaded: img.complete && img.naturalWidth > 0,
        });
      }
    });

    // Find content cards (look for cards with movie/series content)
    document.querySelectorAll('[class*="card"], [class*="Card"]').forEach((card, i) => {
      const rect = card.getBoundingClientRect();
      if (rect.width > 50 && rect.height > 50) {
        const title = card.querySelector('[class*="title"], [class*="Title"]')?.textContent;
        const img = card.querySelector('img');
        state.contentCards.push({
          index: i,
          size: `${rect.width.toFixed(0)}x${rect.height.toFixed(0)}`,
          title: title?.substring(0, 30) || 'no title',
          hasImage: !!img,
          imageLoaded: img ? (img.complete && img.naturalWidth > 0) : false,
        });
      }
    });

    // Find ContentCarousel sections (look for ScrollView with items)
    document.querySelectorAll('[class*="scroll"]').forEach((scroll, i) => {
      const parent = scroll.parentElement;
      const title = parent?.querySelector('[class*="font-bold"]')?.textContent;
      const items = scroll.querySelectorAll('[class*="card"], [class*="Card"], a');
      if (title && items.length > 0) {
        state.categories.push({
          title: title.substring(0, 40),
          itemCount: items.length,
        });
      }
    });

    // Check for red/error borders (broken images)
    document.querySelectorAll('img').forEach(img => {
      if (!img.complete || img.naturalWidth === 0) {
        state.errors.push(`Broken image: ${img.src?.substring(0, 80)}`);
      }
    });

    return state;
  });

  console.log('\n=== PAGE STATE ANALYSIS ===\n');
  console.log('Loading text found:', pageState.loadingText);
  console.log('\nSection titles:', pageState.sectionTitles);
  console.log('\nCarousel images:', JSON.stringify(pageState.carouselImages, null, 2));
  console.log('\nContent cards:', JSON.stringify(pageState.contentCards.slice(0, 10), null, 2));
  console.log('\nCategories:', JSON.stringify(pageState.categories, null, 2));
  console.log('\nErrors (broken images):', pageState.errors.slice(0, 5));

  // Scroll down to see more content
  await page.evaluate(() => window.scrollBy(0, 1000));
  await page.waitForTimeout(2000);

  const afterScroll = await page.evaluate(() => {
    const cards: any[] = [];
    document.querySelectorAll('[class*="card"], [class*="Card"]').forEach((card, i) => {
      const rect = card.getBoundingClientRect();
      if (rect.width > 50 && rect.height > 50 && rect.top < window.innerHeight && rect.top > -100) {
        cards.push({
          index: i,
          top: rect.top.toFixed(0),
          title: card.querySelector('[class*="title"]')?.textContent?.substring(0, 30) || 'unknown',
        });
      }
    });
    return cards;
  });

  console.log('\nVisible cards after scroll:', JSON.stringify(afterScroll, null, 2));

  // Take screenshots
  await page.screenshot({ path: '/tmp/homepage-scrolled.png' });
  console.log('\nScreenshot saved to /tmp/homepage-scrolled.png');
});
