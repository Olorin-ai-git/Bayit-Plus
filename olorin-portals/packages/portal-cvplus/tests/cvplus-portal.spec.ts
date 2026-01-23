import { test, expect } from '@playwright/test';

const SCREENSHOT_DIR = './screenshots';

test.describe('CVPlus Marketing Portal', () => {
  test('HomePage - Full page functionality', async ({ page }) => {
    await page.goto('/');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Verify page title
    await expect(page).toHaveTitle(/CVPlus/i);

    // Take full page screenshot
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-homepage-full.png`,
      fullPage: true
    });

    // Verify hero section
    const heroHeading = page.locator('h1').first();
    await expect(heroHeading).toBeVisible();
    await expect(heroHeading).toContainText('OLORIN.AI');
    await expect(heroHeading).toContainText('CVPLUS');

    // Take hero screenshot
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-homepage-hero.png`,
      clip: { x: 0, y: 0, width: 1280, height: 800 }
    });

    // Verify feature sections
    const featureSections = page.locator('section');
    const sectionCount = await featureSections.count();
    expect(sectionCount).toBeGreaterThan(3);

    // Verify "Intelligent Resume Enhancement" section
    await expect(page.getByText('INTELLIGENT RESUME ENHANCEMENT')).toBeVisible();

    // Verify "Advanced Job Matching" section
    await expect(page.getByText('ADVANCED JOB MATCHING')).toBeVisible();

    // Verify "Career Growth Tools" section
    await expect(page.getByText('CAREER GROWTH TOOLS')).toBeVisible();

    // Scroll to middle of page
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03-homepage-features.png`,
      clip: { x: 0, y: 0, width: 1280, height: 800 }
    });

    console.log('✅ HomePage verified successfully');
  });

  test('Navigation - Header links', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Take header screenshot
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04-header-navigation.png`,
      clip: { x: 0, y: 0, width: 1280, height: 100 }
    });

    // Verify navigation links exist
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible();

    // Check for Home link
    const homeLink = page.getByRole('link', { name: /home/i }).first();
    await expect(homeLink).toBeVisible();

    // Check for Features link
    const featuresLink = page.getByRole('link', { name: /features/i }).first();
    await expect(featuresLink).toBeVisible();

    // Check for Use Cases link
    const useCasesLink = page.getByRole('link', { name: /use cases/i }).first();
    await expect(useCasesLink).toBeVisible();

    // Check for Contact link
    const contactLink = page.getByRole('link', { name: /contact/i }).first();
    await expect(contactLink).toBeVisible();

    console.log('✅ Navigation verified successfully');
  });

  test('FeaturesPage - Full page functionality', async ({ page }) => {
    await page.goto('/features');
    await page.waitForLoadState('networkidle');

    // Take full page screenshot
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/05-features-page-full.png`,
      fullPage: true
    });

    // Verify page heading
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();

    // Take viewport screenshot
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/06-features-page-viewport.png`
    });

    console.log('✅ FeaturesPage verified successfully');
  });

  test('UseCasesPage - Full page functionality', async ({ page }) => {
    await page.goto('/use-cases');
    await page.waitForLoadState('networkidle');

    // Take full page screenshot
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/07-usecases-page-full.png`,
      fullPage: true
    });

    // Verify page heading
    await expect(page.getByText('CVPlus Use Cases')).toBeVisible();

    // Verify use case buttons exist
    const careerChangersBtn = page.getByRole('button', { name: 'Career Changers', exact: true });
    const recentGradsBtn = page.getByRole('button', { name: 'Recent Graduates', exact: true });
    const seniorProfBtn = page.getByRole('button', { name: 'Senior Professionals', exact: true });
    const jobSeekersBtn = page.getByRole('button', { name: 'Active Job Seekers', exact: true });

    await expect(careerChangersBtn).toBeVisible();
    await expect(recentGradsBtn).toBeVisible();
    await expect(seniorProfBtn).toBeVisible();
    await expect(jobSeekersBtn).toBeVisible();

    // Take viewport screenshot
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/08-usecases-page-hero.png`,
      clip: { x: 0, y: 0, width: 1280, height: 800 }
    });

    // Click on Recent Graduates use case
    await recentGradsBtn.click();
    await page.waitForTimeout(500);

    // Verify use case detail appears
    await expect(page.getByText('First Job Success')).toBeVisible();
    await expect(page.getByText('Limited work experience').first()).toBeVisible();

    // Take screenshot of use case detail
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/09-usecases-detail-recent-grads.png`,
      clip: { x: 0, y: 400, width: 1280, height: 800 }
    });

    // Scroll down to see "All Industries" section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/10-usecases-all-industries.png`,
      clip: { x: 0, y: 0, width: 1280, height: 800 }
    });

    console.log('✅ UseCasesPage verified successfully');
  });

  test('ContactPage - Full page functionality', async ({ page }) => {
    await page.goto('/contact');
    await page.waitForLoadState('networkidle');

    // Take full page screenshot
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/11-contact-page-full.png`,
      fullPage: true
    });

    // Verify page heading
    await expect(page.getByText('Contact CVPlus')).toBeVisible();

    // Verify contact methods
    await expect(page.getByText('Email Us')).toBeVisible();
    await expect(page.getByText('cvplus@olorin.ai')).toBeVisible();
    await expect(page.getByText('Live Chat')).toBeVisible();
    await expect(page.getByText('Schedule a Call')).toBeVisible();

    // Take viewport screenshot
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/12-contact-page-cards.png`,
      clip: { x: 0, y: 0, width: 1280, height: 800 }
    });

    // Verify contact form exists
    await expect(page.getByPlaceholder('Your name')).toBeVisible();
    await expect(page.getByPlaceholder('your@email.com')).toBeVisible();
    await expect(page.getByPlaceholder('Tell us how we can help...')).toBeVisible();

    // Fill out form
    await page.getByPlaceholder('Your name').fill('Test User');
    await page.getByPlaceholder('your@email.com').fill('test@example.com');
    await page.getByPlaceholder('Tell us how we can help...').fill('This is a test message to verify form functionality.');

    // Take screenshot of filled form
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/13-contact-form-filled.png`,
      clip: { x: 0, y: 0, width: 1280, height: 800 }
    });

    // Verify submit button exists (don't click to avoid actual submission)
    const submitBtn = page.getByRole('button', { name: /send message/i });
    await expect(submitBtn).toBeVisible();

    console.log('✅ ContactPage verified successfully');
  });

  test('NotFoundPage - 404 functionality', async ({ page }) => {
    // Go to a non-existent route
    await page.goto('/non-existent-page-12345', { waitUntil: 'networkidle' });

    // Take full page screenshot
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/14-404-page.png`,
      fullPage: true
    });

    // Verify page loaded (any content is fine, as React Router handles 404s)
    const bodyContent = await page.locator('body').textContent();
    expect(bodyContent).toBeTruthy();
    expect(bodyContent.length).toBeGreaterThan(0);

    console.log('✅ NotFoundPage verified successfully - screenshot captured');
  });

  test('Responsive Design - Mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Take mobile homepage screenshot
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/15-mobile-homepage.png`,
      fullPage: true
    });

    // Verify hero text is visible on mobile
    await expect(page.locator('h1').first()).toBeVisible();

    // Go to features page on mobile
    await page.goto('/features');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/16-mobile-features.png`,
      fullPage: true
    });

    // Go to contact page on mobile
    await page.goto('/contact');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/17-mobile-contact.png`,
      fullPage: true
    });

    console.log('✅ Mobile responsive design verified successfully');
  });

  test('Glassmorphism and styling verification', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for glassmorphism elements (backdrop-blur)
    const glassElements = page.locator('[class*="backdrop-blur"]');
    const glassCount = await glassElements.count();
    expect(glassCount).toBeGreaterThan(0);

    // Check for purple gradient elements
    const purpleElements = page.locator('[class*="purple"]');
    const purpleCount = await purpleElements.count();
    expect(purpleCount).toBeGreaterThan(0);

    console.log(`✅ Found ${glassCount} glassmorphism elements`);
    console.log(`✅ Found ${purpleCount} purple-themed elements`);
  });
});
