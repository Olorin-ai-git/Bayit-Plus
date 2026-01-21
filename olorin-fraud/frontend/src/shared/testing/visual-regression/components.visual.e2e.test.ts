/**
 * Component Visual Regression Tests
 * Tests visual consistency of shared components across different states and themes
 * Validates component rendering in isolation and within different contexts
 */

import { test, expect, Page } from '@playwright/test';
import { VisualRegressionEngine } from './visual-regression-engine';
import { E2ETestEnvironment } from '../e2e/e2e-setup';

test.describe('Component Visual Regression', () => {
  let testEnv: E2ETestEnvironment;
  let visualEngine: VisualRegressionEngine;
  let page: Page;

  test.beforeAll(async () => {
    testEnv = new E2ETestEnvironment();
    await testEnv.initialize();
    page = await testEnv.getPage();
    visualEngine = new VisualRegressionEngine();
  });

  test.afterAll(async () => {
    await testEnv.cleanup();
  });

  test('should test Button component visual states', async () => {
    // Create a test page with all button variants
    const buttonTestHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Button Component Test</title>
        <link href="./src/styles/globals.css" rel="stylesheet">
        <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
        <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
      </head>
      <body>
        <div id="root">
          <div style="padding: 20px; display: grid; gap: 20px;">
            <h1>Button Component Visual Test</h1>

            <section>
              <h2>Button Variants</h2>
              <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" data-testid="primary-button">
                  Primary Button
                </button>
                <button class="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded" data-testid="secondary-button">
                  Secondary Button
                </button>
                <button class="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded" data-testid="danger-button">
                  Danger Button
                </button>
                <button class="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded" data-testid="success-button">
                  Success Button
                </button>
              </div>
            </section>

            <section>
              <h2>Button Sizes</h2>
              <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                <button class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded text-sm" data-testid="small-button">
                  Small
                </button>
                <button class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" data-testid="medium-button">
                  Medium
                </button>
                <button class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded text-lg" data-testid="large-button">
                  Large
                </button>
              </div>
            </section>

            <section>
              <h2>Button States</h2>
              <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" data-testid="normal-button">
                  Normal
                </button>
                <button class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded opacity-50 cursor-not-allowed" disabled data-testid="disabled-button">
                  Disabled
                </button>
                <button class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded opacity-75" data-testid="loading-button">
                  <span>Loading...</span>
                  <div class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2"></div>
                </button>
              </div>
            </section>
          </div>
        </div>
      </body>
      </html>
    `;

    await page.setContent(buttonTestHtml);
    await page.waitForLoadState('networkidle');

    await test.step('Capture button variants baseline', async () => {
      await expect(page.locator('[data-testid="primary-button"]')).toHaveScreenshot('button-primary.png');
      await expect(page.locator('[data-testid="secondary-button"]')).toHaveScreenshot('button-secondary.png');
      await expect(page.locator('[data-testid="danger-button"]')).toHaveScreenshot('button-danger.png');
      await expect(page.locator('[data-testid="success-button"]')).toHaveScreenshot('button-success.png');
    });

    await test.step('Capture button sizes', async () => {
      await expect(page.locator('[data-testid="small-button"]')).toHaveScreenshot('button-small.png');
      await expect(page.locator('[data-testid="medium-button"]')).toHaveScreenshot('button-medium.png');
      await expect(page.locator('[data-testid="large-button"]')).toHaveScreenshot('button-large.png');
    });

    await test.step('Capture button states', async () => {
      await expect(page.locator('[data-testid="normal-button"]')).toHaveScreenshot('button-normal.png');
      await expect(page.locator('[data-testid="disabled-button"]')).toHaveScreenshot('button-disabled.png');
      await expect(page.locator('[data-testid="loading-button"]')).toHaveScreenshot('button-loading.png');
    });

    await test.step('Test button hover states', async () => {
      const hoverButton = page.locator('[data-testid="primary-button"]');
      await hoverButton.hover();
      await page.waitForTimeout(200);
      await expect(hoverButton).toHaveScreenshot('button-primary-hover.png');
    });

    await test.step('Test button focus states', async () => {
      const focusButton = page.locator('[data-testid="secondary-button"]');
      await focusButton.focus();
      await page.waitForTimeout(200);
      await expect(focusButton).toHaveScreenshot('button-secondary-focus.png');
    });
  });

  test('should test Card component visual states', async () => {
    const cardTestHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Card Component Test</title>
        <link href="./src/styles/globals.css" rel="stylesheet">
      </head>
      <body>
        <div style="padding: 20px; display: grid; gap: 20px; max-width: 800px;">
          <h1>Card Component Visual Test</h1>

          <section>
            <h2>Basic Cards</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
              <div class="bg-white shadow-md rounded-lg p-6" data-testid="basic-card">
                <h3 class="text-lg font-semibold mb-2">Basic Card</h3>
                <p class="text-gray-600">This is a basic card component with shadow and rounded corners.</p>
              </div>

              <div class="bg-white shadow-lg rounded-lg p-6 border-l-4 border-blue-500" data-testid="accent-card">
                <h3 class="text-lg font-semibold mb-2">Accent Card</h3>
                <p class="text-gray-600">This card has an accent border and stronger shadow.</p>
              </div>

              <div class="bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg rounded-lg p-6" data-testid="gradient-card">
                <h3 class="text-lg font-semibold mb-2">Gradient Card</h3>
                <p class="text-blue-100">This card features a gradient background.</p>
              </div>
            </div>
          </section>

          <section>
            <h2>Interactive Cards</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
              <div class="bg-white shadow-md rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer" data-testid="hover-card">
                <h3 class="text-lg font-semibold mb-2">Hoverable Card</h3>
                <p class="text-gray-600">This card changes shadow on hover.</p>
              </div>

              <div class="bg-white shadow-md rounded-lg p-6 transform hover:scale-105 transition-transform cursor-pointer" data-testid="scale-card">
                <h3 class="text-lg font-semibold mb-2">Scale Card</h3>
                <p class="text-gray-600">This card scales on hover.</p>
              </div>
            </div>
          </section>

          <section>
            <h2>Card with Content</h2>
            <div class="bg-white shadow-md rounded-lg overflow-hidden" data-testid="content-card">
              <div class="h-32 bg-gradient-to-r from-green-400 to-blue-500"></div>
              <div class="p-6">
                <h3 class="text-lg font-semibold mb-2">Content Card</h3>
                <p class="text-gray-600 mb-4">This card includes an image area and structured content.</p>
                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-500">Last updated: Today</span>
                  <button class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                    View Details
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </body>
      </html>
    `;

    await page.setContent(cardTestHtml);
    await page.waitForLoadState('networkidle');

    await test.step('Capture card variants', async () => {
      await expect(page.locator('[data-testid="basic-card"]')).toHaveScreenshot('card-basic.png');
      await expect(page.locator('[data-testid="accent-card"]')).toHaveScreenshot('card-accent.png');
      await expect(page.locator('[data-testid="gradient-card"]')).toHaveScreenshot('card-gradient.png');
      await expect(page.locator('[data-testid="content-card"]')).toHaveScreenshot('card-content.png');
    });

    await test.step('Test card hover states', async () => {
      const hoverCard = page.locator('[data-testid="hover-card"]');
      await hoverCard.hover();
      await page.waitForTimeout(300);
      await expect(hoverCard).toHaveScreenshot('card-hover-shadow.png');

      const scaleCard = page.locator('[data-testid="scale-card"]');
      await scaleCard.hover();
      await page.waitForTimeout(300);
      await expect(scaleCard).toHaveScreenshot('card-hover-scale.png');
    });
  });

  test('should test Loading component visual states', async () => {
    const loadingTestHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Loading Component Test</title>
        <link href="./src/styles/globals.css" rel="stylesheet">
        <style>
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .animate-spin { animation: spin 1s linear infinite; }
          .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: .5; }
          }
        </style>
      </head>
      <body>
        <div style="padding: 20px; display: grid; gap: 20px;">
          <h1>Loading Component Visual Test</h1>

          <section>
            <h2>Spinner Sizes</h2>
            <div style="display: flex; gap: 20px; align-items: center; flex-wrap: wrap;">
              <div class="flex items-center" data-testid="small-spinner">
                <div class="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span class="ml-2">Small</span>
              </div>

              <div class="flex items-center" data-testid="medium-spinner">
                <div class="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span class="ml-2">Medium</span>
              </div>

              <div class="flex items-center" data-testid="large-spinner">
                <div class="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span class="ml-2">Large</span>
              </div>
            </div>
          </section>

          <section>
            <h2>Loading Messages</h2>
            <div style="display: grid; gap: 15px;">
              <div class="flex items-center justify-center p-4 bg-gray-50 rounded" data-testid="loading-with-message">
                <div class="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3"></div>
                <span>Loading investigation data...</span>
              </div>

              <div class="flex items-center justify-center p-4 bg-blue-50 rounded" data-testid="loading-processing">
                <div class="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-3"></div>
                <span class="text-blue-700">Processing your request...</span>
              </div>

              <div class="flex items-center justify-center p-4 bg-yellow-50 rounded" data-testid="loading-analyzing">
                <div class="w-6 h-6 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin mr-3"></div>
                <span class="text-yellow-700">Analyzing data patterns...</span>
              </div>
            </div>
          </section>

          <section>
            <h2>Skeleton Loading</h2>
            <div class="bg-white p-4 rounded shadow" data-testid="skeleton-loading">
              <div class="animate-pulse">
                <div class="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                <div class="h-4 bg-gray-300 rounded w-1/2 mb-4"></div>
                <div class="h-32 bg-gray-300 rounded mb-4"></div>
                <div class="h-4 bg-gray-300 rounded w-full mb-2"></div>
                <div class="h-4 bg-gray-300 rounded w-2/3"></div>
              </div>
            </div>
          </section>

          <section>
            <h2>Progress Indicators</h2>
            <div style="display: grid; gap: 15px;">
              <div data-testid="progress-bar">
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div class="bg-blue-600 h-2 rounded-full" style="width: 45%"></div>
                </div>
                <span class="text-sm text-gray-600">45% Complete</span>
              </div>

              <div data-testid="progress-steps">
                <div class="flex items-center">
                  <div class="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm">1</div>
                  <div class="flex-1 h-1 bg-blue-500 mx-2"></div>
                  <div class="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm">2</div>
                  <div class="flex-1 h-1 bg-gray-300 mx-2"></div>
                  <div class="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-sm">3</div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </body>
      </html>
    `;

    await page.setContent(loadingTestHtml);
    await page.waitForLoadState('networkidle');

    await test.step('Capture loading components', async () => {
      await expect(page.locator('[data-testid="small-spinner"]')).toHaveScreenshot('loading-small-spinner.png');
      await expect(page.locator('[data-testid="medium-spinner"]')).toHaveScreenshot('loading-medium-spinner.png');
      await expect(page.locator('[data-testid="large-spinner"]')).toHaveScreenshot('loading-large-spinner.png');
      await expect(page.locator('[data-testid="loading-with-message"]')).toHaveScreenshot('loading-with-message.png');
      await expect(page.locator('[data-testid="skeleton-loading"]')).toHaveScreenshot('loading-skeleton.png');
      await expect(page.locator('[data-testid="progress-bar"]')).toHaveScreenshot('loading-progress-bar.png');
      await expect(page.locator('[data-testid="progress-steps"]')).toHaveScreenshot('loading-progress-steps.png');
    });
  });

  test('should test component accessibility states', async () => {
    const accessibilityTestHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Accessibility Visual Test</title>
        <link href="./src/styles/globals.css" rel="stylesheet">
      </head>
      <body>
        <div style="padding: 20px;">
          <h1>Accessibility Visual Test</h1>

          <section style="margin: 20px 0;">
            <h2>Focus States</h2>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <button class="bg-blue-500 text-white px-4 py-2 rounded focus:ring-2 focus:ring-blue-300 focus:outline-none" data-testid="focus-button">
                Focusable Button
              </button>
              <input type="text" placeholder="Focusable Input" class="border border-gray-300 px-3 py-2 rounded focus:ring-2 focus:ring-blue-300 focus:border-blue-500 focus:outline-none" data-testid="focus-input">
              <select class="border border-gray-300 px-3 py-2 rounded focus:ring-2 focus:ring-blue-300 focus:border-blue-500 focus:outline-none" data-testid="focus-select">
                <option>Option 1</option>
                <option>Option 2</option>
              </select>
            </div>
          </section>

          <section style="margin: 20px 0;">
            <h2>High Contrast Mode</h2>
            <div style="display: grid; gap: 10px;" data-testid="high-contrast-section">
              <button class="bg-black text-white border-2 border-white px-4 py-2">High Contrast Button</button>
              <div class="bg-white text-black border-2 border-black p-4">High Contrast Card</div>
              <input type="text" placeholder="High Contrast Input" class="bg-white text-black border-2 border-black px-3 py-2">
            </div>
          </section>
        </div>
      </body>
      </html>
    `;

    await page.setContent(accessibilityTestHtml);
    await page.waitForLoadState('networkidle');

    await test.step('Test focus states', async () => {
      const focusButton = page.locator('[data-testid="focus-button"]');
      await focusButton.focus();
      await page.waitForTimeout(200);
      await expect(focusButton).toHaveScreenshot('accessibility-focus-button.png');

      const focusInput = page.locator('[data-testid="focus-input"]');
      await focusInput.focus();
      await page.waitForTimeout(200);
      await expect(focusInput).toHaveScreenshot('accessibility-focus-input.png');

      const focusSelect = page.locator('[data-testid="focus-select"]');
      await focusSelect.focus();
      await page.waitForTimeout(200);
      await expect(focusSelect).toHaveScreenshot('accessibility-focus-select.png');
    });

    await test.step('Test high contrast mode', async () => {
      await expect(page.locator('[data-testid="high-contrast-section"]')).toHaveScreenshot('accessibility-high-contrast.png');
    });
  });

  test('should test component dark theme variations', async () => {
    const darkThemeHtml = `
      <!DOCTYPE html>
      <html lang="en" data-theme="dark">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Dark Theme Test</title>
        <link href="./src/styles/globals.css" rel="stylesheet">
        <style>
          [data-theme="dark"] {
            background-color: #1a1a1a;
            color: #ffffff;
          }
          [data-theme="dark"] .bg-white { background-color: #2d2d2d; }
          [data-theme="dark"] .text-gray-600 { color: #a0a0a0; }
          [data-theme="dark"] .border-gray-300 { border-color: #404040; }
        </style>
      </head>
      <body class="bg-gray-900 text-white">
        <div style="padding: 20px;">
          <h1>Dark Theme Component Test</h1>

          <section style="margin: 20px 0;">
            <h2>Dark Theme Buttons</h2>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <button class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded" data-testid="dark-primary-button">
                Primary
              </button>
              <button class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded" data-testid="dark-secondary-button">
                Secondary
              </button>
              <button class="border border-gray-400 text-gray-300 hover:bg-gray-700 px-4 py-2 rounded" data-testid="dark-outline-button">
                Outline
              </button>
            </div>
          </section>

          <section style="margin: 20px 0;">
            <h2>Dark Theme Cards</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
              <div class="bg-gray-800 shadow-lg rounded-lg p-6" data-testid="dark-card">
                <h3 class="text-lg font-semibold mb-2 text-white">Dark Card</h3>
                <p class="text-gray-300">This is a card component in dark theme.</p>
              </div>
            </div>
          </section>

          <section style="margin: 20px 0;">
            <h2>Dark Theme Forms</h2>
            <div style="display: grid; gap: 10px; max-width: 400px;">
              <input type="text" placeholder="Dark theme input" class="bg-gray-700 text-white border border-gray-600 px-3 py-2 rounded focus:ring-2 focus:ring-blue-400" data-testid="dark-input">
              <select class="bg-gray-700 text-white border border-gray-600 px-3 py-2 rounded" data-testid="dark-select">
                <option>Dark Option 1</option>
                <option>Dark Option 2</option>
              </select>
            </div>
          </section>
        </div>
      </body>
      </html>
    `;

    await page.setContent(darkThemeHtml);
    await page.waitForLoadState('networkidle');

    await test.step('Capture dark theme components', async () => {
      await expect(page.locator('[data-testid="dark-primary-button"]')).toHaveScreenshot('dark-theme-primary-button.png');
      await expect(page.locator('[data-testid="dark-secondary-button"]')).toHaveScreenshot('dark-theme-secondary-button.png');
      await expect(page.locator('[data-testid="dark-outline-button"]')).toHaveScreenshot('dark-theme-outline-button.png');
      await expect(page.locator('[data-testid="dark-card"]')).toHaveScreenshot('dark-theme-card.png');
      await expect(page.locator('[data-testid="dark-input"]')).toHaveScreenshot('dark-theme-input.png');
      await expect(page.locator('[data-testid="dark-select"]')).toHaveScreenshot('dark-theme-select.png');
    });
  });
});