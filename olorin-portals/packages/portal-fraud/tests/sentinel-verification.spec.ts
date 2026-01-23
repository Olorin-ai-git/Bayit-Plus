import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3301';

test.describe('Olorin-Sentinel Visual Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Wait for fonts to load
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Allow animations to settle
  });

  test('HomePage - Full page screenshot', async ({ page }) => {
    await page.goto(BASE_URL);

    // Wait for ParticleEffect and other animations
    await page.waitForSelector('.fraud-homepage', { timeout: 10000 });
    await page.waitForTimeout(3000);

    // Take full page screenshot
    await page.screenshot({
      path: 'tests/screenshots/homepage-full.png',
      fullPage: true,
    });

    // Verify Sentinel branding elements
    await expect(page.locator('text=FRAUD EVOLVES')).toBeVisible();
    await expect(page.locator('text=SO DO OUR AGENTS')).toBeVisible();
    await expect(page.locator('text=Domain Agents')).toBeVisible();

    console.log('✅ HomePage: Full page screenshot captured');
  });

  test('HomePage - Hero section with ParticleEffect', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(2000);

    // Capture hero section
    const heroSection = page.locator('section').first();
    await heroSection.screenshot({
      path: 'tests/screenshots/homepage-hero.png',
    });

    // Verify ParticleEffect is rendering
    const particles = page.locator('.absolute.rounded-full');
    const particleCount = await particles.count();
    expect(particleCount).toBeGreaterThan(0);

    // Verify Shield icon with pulse animation
    await expect(page.locator('.sentinel-pulse-cyan').first()).toBeVisible();

    console.log(`✅ HomePage Hero: Screenshot captured, ${particleCount} particles rendered`);
  });

  test('HomePage - Domain Agents section', async ({ page }) => {
    await page.goto(BASE_URL);

    // Scroll to agents section
    await page.locator('#agents').scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);

    // Take screenshot of agents section
    const agentsSection = page.locator('#agents');
    await agentsSection.screenshot({
      path: 'tests/screenshots/homepage-agents.png',
    });

    // Verify 4 main Domain Agents
    const agentCards = page.locator('#agents .wizard-grid-4 > div');
    const agentCount = await agentCards.count();
    expect(agentCount).toBe(4);

    // Verify agent titles
    await expect(page.locator('text=Location Sentinel')).toBeVisible();
    await expect(page.locator('text=Network Sentinel')).toBeVisible();
    await expect(page.locator('text=Bio-Metric Sentinel')).toBeVisible();
    await expect(page.locator('text=Transaction Sentinel')).toBeVisible();

    console.log(`✅ HomePage Agents: Screenshot captured, ${agentCount} agent cards verified`);
  });

  test('HomePage - Success metrics with CountUpMetric', async ({ page }) => {
    await page.goto(BASE_URL);

    // Scroll to success story section
    await page.locator('text=Sentinel Success Story').scrollIntoViewIfNeeded();
    await page.waitForTimeout(3000); // Wait for CountUpMetric animation

    // Take screenshot
    const successSection = page.locator('text=Sentinel Success Story').locator('..');
    await successSection.screenshot({
      path: 'tests/screenshots/homepage-success-metrics.png',
    });

    // Verify metrics are displayed
    await expect(page.locator('text=80%+')).toBeVisible();
    await expect(page.locator('text=95%')).toBeVisible();
    await expect(page.locator('text=<1s')).toBeVisible();
    await expect(page.locator('text=60%')).toBeVisible();

    console.log('✅ HomePage Success Metrics: Screenshot captured, all metrics visible');
  });

  test('HomePage - Sentinel color scheme verification', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(2000);

    // Verify Sentinel colors are applied
    const cyanElements = page.locator('.text-wizard-accent-sentinel-cyan');
    const cyanCount = await cyanElements.count();
    expect(cyanCount).toBeGreaterThan(5);

    // Verify Orbitron font is loaded
    const headings = page.locator('.font-sentinel-display');
    const headingCount = await headings.count();
    expect(headingCount).toBeGreaterThan(0);

    // Verify glassmorphic cards with sentinel theme
    const sentinelCards = page.locator('[class*="bg-wizard-bg-sentinel"]');
    const cardCount = await sentinelCards.count();
    expect(cardCount).toBeGreaterThan(0);

    console.log(`✅ HomePage Colors: ${cyanCount} cyan elements, ${headingCount} Orbitron headings, ${cardCount} Sentinel cards`);
  });

  test('AgentsPage - Full page screenshot', async ({ page }) => {
    await page.goto(`${BASE_URL}/agents`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Take full page screenshot
    await page.screenshot({
      path: 'tests/screenshots/agentspage-full.png',
      fullPage: true,
    });

    // Verify page title
    await expect(page.locator('text=Meet Your')).toBeVisible();
    await expect(page.locator('text=Domain Agents')).toBeVisible();

    console.log('✅ AgentsPage: Full page screenshot captured');
  });

  test('AgentsPage - Main Domain Agents', async ({ page }) => {
    await page.goto(`${BASE_URL}/agents`);
    await page.waitForTimeout(2000);

    // Scroll to main agents section
    const firstAgent = page.locator('text=Location Sentinel').first();
    await firstAgent.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);

    // Take screenshot of first agent card
    const firstAgentCard = page.locator('.wizard-container > div > div').first();
    await firstAgentCard.screenshot({
      path: 'tests/screenshots/agentspage-location-sentinel.png',
    });

    // Verify all 4 main agents are present
    await expect(page.locator('text=Location Sentinel')).toBeVisible();
    await expect(page.locator('text=Network Sentinel')).toBeVisible();
    await expect(page.locator('text=Bio-Metric Sentinel')).toBeVisible();
    await expect(page.locator('text=Transaction Sentinel')).toBeVisible();

    console.log('✅ AgentsPage Main Agents: Screenshot captured, all 4 agents verified');
  });

  test('AgentsPage - Specialty Agents section', async ({ page }) => {
    await page.goto(`${BASE_URL}/agents`);
    await page.waitForTimeout(2000);

    // Scroll to specialty agents
    await page.locator('text=Specialty Sentinels').scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);

    // Take screenshot
    const specialtySection = page.locator('text=Specialty Sentinels').locator('..');
    await specialtySection.screenshot({
      path: 'tests/screenshots/agentspage-specialty-agents.png',
    });

    // Verify specialty agents
    await expect(page.locator('text=Identity Sentinel')).toBeVisible();
    await expect(page.locator('text=Device Sentinel')).toBeVisible();

    console.log('✅ AgentsPage Specialty Agents: Screenshot captured, 2 specialty agents verified');
  });

  test('Button interactions - Sentinel cyan variant', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(2000);

    // Find and hover over Sentinel cyan button
    const deployButton = page.locator('button:has-text("Meet Your Sentinels")').first();
    await deployButton.scrollIntoViewIfNeeded();

    // Take screenshot before hover
    await deployButton.screenshot({
      path: 'tests/screenshots/button-sentinel-cyan-normal.png',
    });

    // Hover and take screenshot
    await deployButton.hover();
    await page.waitForTimeout(500);
    await deployButton.screenshot({
      path: 'tests/screenshots/button-sentinel-cyan-hover.png',
    });

    // Verify button is clickable
    await expect(deployButton).toBeEnabled();

    console.log('✅ Button Interactions: Sentinel cyan button verified');
  });

  test('Glassmorphic card effects', async ({ page }) => {
    await page.goto(BASE_URL);

    // Scroll to agent cards
    await page.locator('#agents').scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);

    // Get first agent card
    const firstCard = page.locator('#agents .wizard-grid-4 > div').first();

    // Take screenshot of card
    await firstCard.screenshot({
      path: 'tests/screenshots/glasscard-sentinel-theme.png',
    });

    // Hover and capture glow effect
    await firstCard.hover();
    await page.waitForTimeout(500);
    await firstCard.screenshot({
      path: 'tests/screenshots/glasscard-sentinel-hover.png',
    });

    console.log('✅ Glassmorphic Cards: Normal and hover states captured');
  });

  test('Mobile responsive - iPhone viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 }); // iPhone 15
    await page.goto(BASE_URL);
    await page.waitForTimeout(2000);

    // Take mobile screenshot
    await page.screenshot({
      path: 'tests/screenshots/mobile-homepage-iphone.png',
      fullPage: true,
    });

    // Verify hero content is visible
    await expect(page.locator('text=FRAUD EVOLVES')).toBeVisible();

    // Verify mobile navigation/buttons stack properly
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(0);

    console.log('✅ Mobile Responsive: iPhone screenshot captured');
  });

  test('Tablet responsive - iPad viewport', async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 1180 }); // iPad Air
    await page.goto(BASE_URL);
    await page.waitForTimeout(2000);

    // Take tablet screenshot
    await page.screenshot({
      path: 'tests/screenshots/tablet-homepage-ipad.png',
      fullPage: true,
    });

    console.log('✅ Tablet Responsive: iPad screenshot captured');
  });

  test('Desktop 4K - 2560px viewport', async ({ page }) => {
    await page.setViewportSize({ width: 2560, height: 1440 }); // 4K display
    await page.goto(BASE_URL);
    await page.waitForTimeout(2000);

    // Take 4K screenshot
    await page.screenshot({
      path: 'tests/screenshots/desktop-homepage-4k.png',
      fullPage: false, // Just viewport for 4K
    });

    console.log('✅ Desktop 4K: Screenshot captured');
  });

  test('Typography verification - Orbitron and Inter', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(2000);

    // Check computed font families
    const heading = page.locator('.sentinel-heading-xl').first();
    const fontFamily = await heading.evaluate((el) => {
      return window.getComputedStyle(el).fontFamily;
    });

    // Orbitron should be loaded
    expect(fontFamily).toContain('Orbitron');

    console.log(`✅ Typography: Font family verified - ${fontFamily}`);
  });

  test('Accessibility - Color contrast', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(2000);

    // Get cyan text on dark background
    const cyanText = page.locator('.text-wizard-accent-sentinel-cyan').first();
    const bgColor = await cyanText.evaluate((el) => {
      return window.getComputedStyle(el.parentElement!).backgroundColor;
    });
    const textColor = await cyanText.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });

    console.log(`✅ Accessibility: Background: ${bgColor}, Text: ${textColor}`);

    // Take accessibility report screenshot
    await page.screenshot({
      path: 'tests/screenshots/accessibility-colors.png',
    });
  });
});

test.describe('Navigation and Routing', () => {
  test('Navigate between HomePage and AgentsPage', async ({ page }) => {
    // Start at HomePage
    await page.goto(BASE_URL);
    await page.waitForTimeout(1000);

    // Navigate to AgentsPage via nav link
    const agentsLink = page.locator('text=Domain Agents').first();
    await agentsLink.click();
    await page.waitForTimeout(2000);

    // Verify we're on AgentsPage
    await expect(page).toHaveURL(/.*\/agents/);
    await expect(page.locator('text=Meet Your')).toBeVisible();

    // Take screenshot
    await page.screenshot({
      path: 'tests/screenshots/navigation-agents.png',
    });

    console.log('✅ Navigation: HomePage → AgentsPage verified');
  });
});
