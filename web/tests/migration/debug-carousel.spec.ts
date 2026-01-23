import { test } from '@playwright/test';

test('debug carousel height', async ({ page }) => {
  // Capture console errors
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    errors.push(err.message);
  });

  await page.goto('http://localhost:3000');
  await page.waitForTimeout(5000);

  console.log('\n=== Console Errors ===');
  errors.forEach(e => console.log(e));

  // Get all glass elements and their heights
  const glassElements = await page.evaluate(() => {
    const elements = document.querySelectorAll('[class*="glass"]');
    const results: any[] = [];
    elements.forEach((el, i) => {
      const rect = el.getBoundingClientRect();
      const computed = window.getComputedStyle(el);
      const inline = (el as HTMLElement).style;
      results.push({
        index: i,
        rect: { width: rect.width, height: rect.height },
        computed: {
          height: computed.height,
          minHeight: computed.minHeight,
          maxHeight: computed.maxHeight,
          display: computed.display,
        },
        inline: {
          height: inline.height,
          minHeight: inline.minHeight,
        },
        className: el.className.substring(0, 100),
      });
    });
    return results;
  });

  console.log('Glass elements:');
  glassElements.forEach((el) => console.log(JSON.stringify(el, null, 2)));

  // Find the main carousel wrapper
  const mainCarousel = await page.evaluate(() => {
    // Look for the w-full container that should have height: 600px
    const containers = document.querySelectorAll('[style*="height"]');
    const results: any[] = [];
    containers.forEach((el, i) => {
      const rect = el.getBoundingClientRect();
      const computed = window.getComputedStyle(el);
      const inline = (el as HTMLElement).style;
      if (rect.height > 50 && rect.height < 800) {
        results.push({
          index: i,
          tag: el.tagName,
          rect: { width: rect.width, height: rect.height },
          inlineHeight: inline.height,
          computedHeight: computed.height,
          className: el.className.substring(0, 100),
        });
      }
    });
    return results;
  });

  console.log('\nElements with inline height:');
  mainCarousel.forEach((el) => console.log(JSON.stringify(el, null, 2)));

  // Check for carousel specific elements
  const carouselCheck = await page.evaluate(() => {
    // Look for TouchableOpacity in carousel
    const scrollViews = document.querySelectorAll('[class*="ScrollView"], [data-testid*="carousel"]');
    // Look for image elements
    const images = document.querySelectorAll('img');
    const imageInfo = Array.from(images).slice(0, 5).map(img => ({
      src: img.src?.substring(0, 80),
      naturalSize: { w: img.naturalWidth, h: img.naturalHeight },
      displaySize: { w: img.width, h: img.height },
    }));

    // Find the hero area
    const allDivs = document.querySelectorAll('div');
    let heroArea = null;
    allDivs.forEach(el => {
      const computed = window.getComputedStyle(el);
      const height = parseFloat(computed.height);
      if (height >= 590 && height <= 610) {
        heroArea = {
          height: computed.height,
          visibility: computed.visibility,
          opacity: computed.opacity,
          display: computed.display,
          position: computed.position,
          overflow: computed.overflow,
          childCount: el.children.length,
          innerHTML: el.innerHTML?.substring(0, 200),
        };
      }
    });

    return { heroArea, imageCount: images.length, imageInfo };
  });

  console.log('\n=== Carousel Check ===');
  console.log('Hero area:', JSON.stringify(carouselCheck.heroArea, null, 2));
  console.log('Image count:', carouselCheck.imageCount);
  console.log('Images:', JSON.stringify(carouselCheck.imageInfo, null, 2));

  await page.screenshot({ path: '/tmp/carousel-debug.png', fullPage: false });
});
