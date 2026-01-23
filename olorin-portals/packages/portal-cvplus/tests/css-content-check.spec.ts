import { test } from '@playwright/test';

test('Check CSS content in style tags', async ({ page }) => {
  await page.goto('http://localhost:3305');
  await page.waitForLoadState('networkidle');

  // Get all style tag contents
  const styleContents = await page.evaluate(() => {
    const styleTags = Array.from(document.querySelectorAll('head style'));
    return styleTags.map((tag, index) => ({
      index,
      length: tag.textContent?.length || 0,
      content: tag.textContent?.substring(0, 500) || '', // First 500 chars
      hasTailwind: tag.textContent?.includes('tailwind') || false,
      hasBg: tag.textContent?.includes('bg-') || false,
      hasWizard: tag.textContent?.includes('wizard') || false,
    }));
  });

  console.log('\n=== STYLE TAG ANALYSIS ===');
  styleContents.forEach((style) => {
    console.log(`\nStyle tag ${style.index}:`);
    console.log(`  Length: ${style.length} characters`);
    console.log(`  Has 'tailwind': ${style.hasTailwind}`);
    console.log(`  Has 'bg-': ${style.hasBg}`);
    console.log(`  Has 'wizard': ${style.hasWizard}`);
    console.log(`  Preview: ${style.content.substring(0, 200)}`);
  });

  // Check if index.css content is present
  const hasIndexCss = await page.evaluate(() => {
    const styleTags = Array.from(document.querySelectorAll('head style'));
    return styleTags.some(tag =>
      tag.textContent?.includes('@tailwind') ||
      tag.textContent?.includes('wizard-gradient-bg') ||
      tag.textContent?.includes('glass-effect')
    );
  });

  console.log('\n=== INDEX.CSS CONTENT PRESENT ===');
  console.log('Has @tailwind or wizard classes:', hasIndexCss);

  // Check what's actually imported
  const imports = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script'));
    const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
    return {
      scripts: scripts.length,
      stylesheets: links.length,
      styleTagsInHead: document.querySelectorAll('head style').length,
    };
  });

  console.log('\n=== RESOURCE COUNT ===');
  console.log(JSON.stringify(imports, null, 2));
});
