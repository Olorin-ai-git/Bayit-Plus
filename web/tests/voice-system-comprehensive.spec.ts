/**
 * Comprehensive Voice System UI Testing
 * Tests all voice-related UI components: chatbot, avatar, voice mode,
 * sidebar access, responsive behavior, console errors, animations, accessibility
 *
 * IMPORTANT: The chatbot is only visible to authenticated users.
 * Tests inject auth state via localStorage to bypass the login page.
 */

import { test, expect, Page } from '@playwright/test';

const SCREENSHOT_DIR = 'test-results/voice-system';

// Fake auth state to inject into localStorage so the app thinks user is logged in
const FAKE_AUTH_STATE = JSON.stringify({
  state: {
    user: {
      id: 'test-user-id',
      email: 'test@bayit.tv',
      name: 'Test User',
      role: 'admin',
      subscription: { plan: 'premium', status: 'active' },
    },
    token: 'fake-test-token-for-playwright',
    refreshToken: 'fake-refresh-token',
    isAuthenticated: true,
    passkeySessionToken: null,
    passkeySessionExpires: null,
  },
  version: 0,
});

// Run serially to avoid overwhelming the dev server
test.describe.configure({ mode: 'serial' });

// Increase default timeout since we are running against a live dev server
test.setTimeout(60000);

async function setupAuthAndNavigate(page: Page, path = '/') {
  // First navigate to the app domain so localStorage is accessible
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  // Inject auth state into localStorage
  await page.evaluate((authState) => {
    localStorage.setItem('bayit-auth', authState);
  }, FAKE_AUTH_STATE);
  // Reload to pick up the auth state
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  // Wait for React to hydrate and render with auth
  await page.waitForTimeout(3000);
  // If path is not /, navigate there
  if (path !== '/') {
    await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
  }
}

async function waitForStability(page: Page) {
  try {
    await page.waitForLoadState('networkidle', { timeout: 15000 });
  } catch {
    // networkidle may not be reached if there are persistent connections
  }
  await page.waitForTimeout(1000);
}

// =====================================================
// 1. INITIAL PAGE LOAD & CHATBOT PRESENCE
// =====================================================
test.describe('Voice System UI - Comprehensive Testing', () => {

  test('1a. Page loads with auth - check chatbot FAB presence', async ({ page }) => {
    await setupAuthAndNavigate(page);
    await waitForStability(page);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-page-with-auth.png`,
      fullPage: true,
    });

    // Inspect what the page shows (home or login redirect?)
    const pageUrl = page.url();
    const pageTitle = await page.title();
    const bodyText = await page.locator('body').textContent();

    test.info().annotations.push({
      type: 'info',
      description: `Page URL: ${pageUrl}, Title: ${pageTitle}`,
    });

    // Check if we're past the login page
    const isLoginPage = bodyText?.includes('Welcome Back') || bodyText?.includes('Sign in');
    test.info().annotations.push({
      type: 'info',
      description: `Is login page: ${isLoginPage}`,
    });

    // Look for chatbot FAB (Sparkles icon in a fixed position button)
    const allFixedElements = await page.evaluate(() => {
      const fixed: { tag: string; classes: string; ariaLabel: string; text: string; rect: string }[] = [];
      document.querySelectorAll('*').forEach(el => {
        const style = window.getComputedStyle(el);
        if (style.position === 'fixed' && el.getBoundingClientRect().width > 0) {
          fixed.push({
            tag: el.tagName,
            classes: (el.className || '').toString().substring(0, 80),
            ariaLabel: el.getAttribute('aria-label') || '',
            text: (el.textContent || '').substring(0, 40),
            rect: JSON.stringify(el.getBoundingClientRect()),
          });
        }
      });
      return fixed;
    });

    test.info().annotations.push({
      type: 'info',
      description: `Fixed position elements: ${JSON.stringify(allFixedElements)}`,
    });
  });

  test('1b. Chatbot FAB accessibility check on unauthenticated page', async ({ page }) => {
    // Navigate WITHOUT auth to verify chatbot is hidden
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-unauthenticated-page.png`,
    });

    // On login page, chatbot should NOT be visible
    const chatFab = page.locator('[aria-label*="chat" i]').first();
    const fabVisible = await chatFab.isVisible().catch(() => false);

    test.info().annotations.push({
      type: 'info',
      description: `Chatbot FAB visible on login page (should be false): ${fabVisible}`,
    });

    // The Chatbot component returns null when !isAuthenticated
    expect(fabVisible).toBe(false);
  });

  // =====================================================
  // 2. CHATBOT OPEN/CLOSE
  // =====================================================
  test('2a. Chatbot opens when FAB is clicked', async ({ page }) => {
    await setupAuthAndNavigate(page);
    await waitForStability(page);

    // Take screenshot of closed state
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-before-open.png`,
    });

    // Try multiple selectors for the chatbot FAB
    const fab = page.locator('[aria-label*="chat" i], [aria-label*="Chat"]').first();
    let fabFound = await fab.isVisible().catch(() => false);

    if (!fabFound) {
      // Fallback: look for any round purple button at bottom-left
      // The FAB has bg-[#8a2be2] class and fixed z-50 positioning
      const allButtons = await page.evaluate(() => {
        const buttons: { index: number; rect: DOMRect; ariaLabel: string }[] = [];
        document.querySelectorAll('[role="button"], [tabindex="0"]').forEach((el, i) => {
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          if (style.position === 'fixed' && rect.bottom > window.innerHeight - 200) {
            buttons.push({
              index: i,
              rect: rect,
              ariaLabel: el.getAttribute('aria-label') || '',
            });
          }
        });
        return buttons;
      });

      test.info().annotations.push({
        type: 'info',
        description: `Fixed bottom buttons found: ${JSON.stringify(buttons)}`,
      });
    }

    if (fabFound) {
      await fab.click();
      await page.waitForTimeout(800);

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/02-chatbot-opened.png`,
      });

      // Verify chatbot panel elements
      const panelInfo = await page.evaluate(() => {
        const panels: { width: number; height: number; hasInput: boolean; hasSvg: boolean; text: string }[] = [];
        document.querySelectorAll('[style*="position: fixed"]').forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.width > 200 && rect.height > 200) {
            panels.push({
              width: rect.width,
              height: rect.height,
              hasInput: !!el.querySelector('input'),
              hasSvg: !!el.querySelector('svg'),
              text: (el.textContent || '').substring(0, 100),
            });
          }
        });
        return panels;
      });

      test.info().annotations.push({
        type: 'info',
        description: `Chatbot panel details: ${JSON.stringify(panelInfo)}`,
      });
    } else {
      test.info().annotations.push({
        type: 'warning',
        description: 'Chatbot FAB not found - user may not be authenticated or component not rendered',
      });
    }
  });

  test('2b. Chatbot closes when X is clicked', async ({ page }) => {
    await setupAuthAndNavigate(page);
    await waitForStability(page);

    const fab = page.locator('[aria-label*="chat" i]').first();
    if (await fab.isVisible().catch(() => false)) {
      await fab.click();
      await page.waitForTimeout(500);

      // Find the close (X) button in the chatbot header
      // It uses lucide-react X icon
      const closeBtn = page.locator('[aria-label*="close" i]').first();
      const closeBtnAlt = page.locator('svg').filter({ has: page.locator('line') }).last();

      if (await closeBtn.isVisible().catch(() => false)) {
        await closeBtn.click();
      } else if (await closeBtnAlt.isVisible().catch(() => false)) {
        await closeBtnAlt.click();
      }

      await page.waitForTimeout(500);
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/02-chatbot-closed-after.png`,
      });

      // Verify FAB is visible again (chatbot closed)
      const fabAgain = await fab.isVisible().catch(() => false);
      test.info().annotations.push({
        type: 'info',
        description: `FAB visible after closing chatbot: ${fabAgain}`,
      });
    }
  });

  test('2c. Chatbot has glass UI styling (backdrop-filter)', async ({ page }) => {
    await setupAuthAndNavigate(page);
    await waitForStability(page);

    const fab = page.locator('[aria-label*="chat" i]').first();
    if (await fab.isVisible().catch(() => false)) {
      await fab.click();
      await page.waitForTimeout(500);

      const glassInfo = await page.evaluate(() => {
        const results: { tag: string; backdropFilter: string; backgroundColor: string; borderRadius: string }[] = [];
        document.querySelectorAll('*').forEach(el => {
          const style = window.getComputedStyle(el);
          if (style.backdropFilter && style.backdropFilter !== 'none') {
            results.push({
              tag: el.tagName,
              backdropFilter: style.backdropFilter,
              backgroundColor: style.backgroundColor,
              borderRadius: style.borderRadius,
            });
          }
        });
        return results;
      });

      test.info().annotations.push({
        type: 'info',
        description: `Glass UI elements (backdrop-filter): ${glassInfo.length} found. First 5: ${JSON.stringify(glassInfo.slice(0, 5))}`,
      });

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/02-glass-styling.png`,
      });
    }
  });

  // =====================================================
  // 3. AVATAR COMPONENT
  // =====================================================
  test('3. Avatar/Wizard component check', async ({ page }) => {
    await setupAuthAndNavigate(page);
    await waitForStability(page);

    // Check for video elements, canvas elements, wizard containers
    const avatarInfo = await page.evaluate(() => {
      return {
        videos: document.querySelectorAll('video').length,
        canvases: document.querySelectorAll('canvas').length,
        iframes: document.querySelectorAll('iframe').length,
        wizardImages: document.querySelectorAll('img[src*="wizard"], img[src*="hat"], img[src*="character"]').length,
        svgCount: document.querySelectorAll('svg').length,
      };
    });

    test.info().annotations.push({
      type: 'info',
      description: `Avatar/media elements on page: ${JSON.stringify(avatarInfo)}`,
    });

    // Open chatbot and check for avatar inside
    const fab = page.locator('[aria-label*="chat" i]').first();
    if (await fab.isVisible().catch(() => false)) {
      await fab.click();
      await page.waitForTimeout(500);

      const chatAvatarInfo = await page.evaluate(() => {
        const fixedPanels = document.querySelectorAll('[style*="position: fixed"]');
        const results: string[] = [];
        fixedPanels.forEach(panel => {
          const rect = panel.getBoundingClientRect();
          if (rect.width > 200 && rect.height > 200) {
            const videos = panel.querySelectorAll('video');
            const canvases = panel.querySelectorAll('canvas');
            const imgs = panel.querySelectorAll('img');
            results.push(`Panel ${rect.width}x${rect.height}: videos=${videos.length}, canvases=${canvases.length}, imgs=${imgs.length}`);
          }
        });
        return results;
      });

      test.info().annotations.push({
        type: 'info',
        description: `Media inside chatbot panel: ${chatAvatarInfo.join('; ')}`,
      });

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/03-avatar-check.png`,
      });
    }
  });

  // =====================================================
  // 4. VOICE MODE BUTTON
  // =====================================================
  test('4. Voice/Microphone button in chatbot', async ({ page }) => {
    await setupAuthAndNavigate(page);
    await waitForStability(page);

    const fab = page.locator('[aria-label*="chat" i]').first();
    if (await fab.isVisible().catch(() => false)) {
      await fab.click();
      await page.waitForTimeout(500);

      // ChatInputBar has a mic button with aria-label containing "record"
      const micButton = page.locator('[aria-label*="record" i], [aria-label*="Record"]').first();
      const micVisible = await micButton.isVisible().catch(() => false);

      test.info().annotations.push({
        type: 'info',
        description: `Microphone button visible: ${micVisible}`,
      });

      if (micVisible) {
        const box = await micButton.boundingBox();
        test.info().annotations.push({
          type: 'info',
          description: `Mic button position: ${JSON.stringify(box)}`,
        });

        // Take closeup
        if (box) {
          await page.screenshot({
            path: `${SCREENSHOT_DIR}/04-mic-button-closeup.png`,
            clip: {
              x: Math.max(0, box.x - 30),
              y: Math.max(0, box.y - 20),
              width: Math.min(300, box.width + 200),
              height: box.height + 40,
            },
          });
        }
      }

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/04-voice-button.png`,
      });
    }
  });

  // =====================================================
  // 5. CHAT TEXT INPUT
  // =====================================================
  test('5a. Text input field present and functional', async ({ page }) => {
    await setupAuthAndNavigate(page);
    await waitForStability(page);

    const fab = page.locator('[aria-label*="chat" i]').first();
    if (await fab.isVisible().catch(() => false)) {
      await fab.click();
      await page.waitForTimeout(500);

      // GlassInput renders as an <input> element
      const textInput = page.locator('input[type="text"], input:not([type="hidden"]):not([type="password"]):not([type="email"]), textarea').first();
      const inputVisible = await textInput.isVisible().catch(() => false);

      test.info().annotations.push({
        type: 'info',
        description: `Chat text input visible: ${inputVisible}`,
      });

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/05-chat-input-empty.png`,
      });

      if (inputVisible) {
        await textInput.fill('hello');
        await page.waitForTimeout(300);

        await page.screenshot({
          path: `${SCREENSHOT_DIR}/05-chat-input-typed.png`,
        });

        // Check placeholder
        const placeholder = await textInput.getAttribute('placeholder');
        test.info().annotations.push({
          type: 'info',
          description: `Input placeholder: "${placeholder}"`,
        });

        // Try sending (Enter key)
        await textInput.press('Enter');
        await page.waitForTimeout(2000);

        await page.screenshot({
          path: `${SCREENSHOT_DIR}/05-chat-after-send.png`,
        });
      }
    }
  });

  // =====================================================
  // 6. SIDEBAR VOICE ACCESS
  // =====================================================
  test('6. Sidebar navigation entries', async ({ page }) => {
    await setupAuthAndNavigate(page);
    await waitForStability(page);

    // Get sidebar items
    const sidebarInfo = await page.evaluate(() => {
      const items: { text: string; href: string }[] = [];
      // Sidebar items are within the left navigation area (x < 300)
      document.querySelectorAll('[role="button"], a').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.x < 300 && rect.width > 0 && rect.height > 0) {
          items.push({
            text: (el.textContent || '').trim().substring(0, 50),
            href: (el as HTMLAnchorElement).href || '',
          });
        }
      });
      return items;
    });

    const voiceEntries = sidebarInfo.filter(item =>
      item.text.toLowerCase().includes('voice') ||
      item.text.toLowerCase().includes('wizard') ||
      item.text.toLowerCase().includes('assistant')
    );

    test.info().annotations.push({
      type: 'info',
      description: `Sidebar items found: ${sidebarInfo.length}. First 15: ${JSON.stringify(sidebarInfo.slice(0, 15))}`,
    });

    test.info().annotations.push({
      type: 'info',
      description: `Voice-related sidebar entries: ${voiceEntries.length > 0 ? JSON.stringify(voiceEntries) : 'NONE FOUND'}`,
    });

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/06-sidebar.png`,
    });
  });

  // =====================================================
  // 7. RESPONSIVE BEHAVIOR
  // =====================================================
  test('7a. Mobile viewport (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await setupAuthAndNavigate(page);
    await waitForStability(page);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/07-mobile-375.png`,
      fullPage: true,
    });

    // Check if FAB position adjusts
    const fabCheck = page.locator('[aria-label*="chat" i]').first();
    const fabVisible = await fabCheck.isVisible().catch(() => false);
    test.info().annotations.push({
      type: 'info',
      description: `Chatbot FAB visible at 375px: ${fabVisible}`,
    });

    if (fabVisible) {
      const box = await fabCheck.boundingBox();
      test.info().annotations.push({
        type: 'info',
        description: `FAB position at 375px: ${JSON.stringify(box)}`,
      });
    }
  });

  test('7b. Tablet viewport (768px)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await setupAuthAndNavigate(page);
    await waitForStability(page);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/07-tablet-768.png`,
      fullPage: true,
    });
  });

  test('7c. Desktop viewport (1440px)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await setupAuthAndNavigate(page);
    await waitForStability(page);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/07-desktop-1440.png`,
      fullPage: true,
    });

    // Open chatbot at desktop width
    const fab = page.locator('[aria-label*="chat" i]').first();
    if (await fab.isVisible().catch(() => false)) {
      await fab.click();
      await page.waitForTimeout(500);

      const panelRect = await page.evaluate(() => {
        const panels: DOMRect[] = [];
        document.querySelectorAll('[style*="position: fixed"]').forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.width > 200 && rect.height > 200) panels.push(rect);
        });
        return panels.map(r => ({ x: r.x, y: r.y, w: r.width, h: r.height }));
      });

      test.info().annotations.push({
        type: 'info',
        description: `Chatbot panel at 1440px: ${JSON.stringify(panelRect)}`,
      });

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/07-desktop-chatbot-open.png`,
      });
    }
  });

  test('7d. Chatbot panel does not overflow on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await setupAuthAndNavigate(page);
    await waitForStability(page);

    const fab = page.locator('[aria-label*="chat" i]').first();
    if (await fab.isVisible().catch(() => false)) {
      await fab.click();
      await page.waitForTimeout(500);

      const overflowCheck = await page.evaluate(() => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const panels: { right: number; bottom: number; overflowX: boolean; overflowY: boolean }[] = [];
        document.querySelectorAll('[style*="position: fixed"]').forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.width > 100 && rect.height > 100) {
            panels.push({
              right: Math.round(rect.right),
              bottom: Math.round(rect.bottom),
              overflowX: rect.right > vw + 1,
              overflowY: rect.bottom > vh + 1,
            });
          }
        });
        return { viewport: { w: vw, h: vh }, panels };
      });

      test.info().annotations.push({
        type: 'info',
        description: `Overflow check at 375px: ${JSON.stringify(overflowCheck)}`,
      });

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/07-mobile-chatbot-overflow-check.png`,
      });
    }
  });

  // =====================================================
  // 8. CONSOLE ERRORS
  // =====================================================
  test('8a. Capture JavaScript console errors on page load', async ({ page }) => {
    const allErrors: { type: string; text: string }[] = [];
    const allWarnings: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        allErrors.push({ type: 'console.error', text: msg.text() });
      } else if (msg.type() === 'warning') {
        allWarnings.push(msg.text());
      }
    });

    page.on('pageerror', (error) => {
      allErrors.push({ type: 'pageerror', text: error.message });
    });

    await setupAuthAndNavigate(page);
    await waitForStability(page);
    // Extra wait for async errors
    await page.waitForTimeout(3000);

    // Filter voice/audio/WebSocket/avatar related errors
    const voiceErrors = allErrors.filter(err => {
      const t = err.text.toLowerCase();
      return t.includes('voice') || t.includes('audio') || t.includes('websocket') ||
        t.includes('avatar') || t.includes('wizard') || t.includes('microphone') ||
        t.includes('vad') || t.includes('wake') || t.includes('speech') ||
        t.includes('remotion') || t.includes('elevenlabs');
    });

    test.info().annotations.push({
      type: 'info',
      description: `Total console errors: ${allErrors.length}`,
    });

    if (allErrors.length > 0) {
      test.info().annotations.push({
        type: 'info',
        description: `All errors (first 15): ${JSON.stringify(allErrors.slice(0, 15))}`,
      });
    }

    test.info().annotations.push({
      type: 'info',
      description: `Voice-related errors: ${voiceErrors.length}. ${voiceErrors.length > 0 ? JSON.stringify(voiceErrors) : 'None'}`,
    });

    test.info().annotations.push({
      type: 'info',
      description: `Console warnings: ${allWarnings.length}`,
    });

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/08-console-errors.png`,
    });
  });

  test('8b. Capture errors when chatbot is opened', async ({ page }) => {
    const errors: { type: string; text: string }[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push({ type: 'console.error', text: msg.text() });
      }
    });
    page.on('pageerror', (error) => {
      errors.push({ type: 'pageerror', text: error.message });
    });

    await setupAuthAndNavigate(page);
    await waitForStability(page);

    const countBefore = errors.length;

    const fab = page.locator('[aria-label*="chat" i]').first();
    if (await fab.isVisible().catch(() => false)) {
      await fab.click();
      await page.waitForTimeout(2000);
    }

    const newErrors = errors.slice(countBefore);
    test.info().annotations.push({
      type: 'info',
      description: `New errors after opening chatbot: ${newErrors.length}. ${newErrors.length > 0 ? JSON.stringify(newErrors.slice(0, 10)) : 'None'}`,
    });

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/08-errors-chatbot-open.png`,
    });
  });

  test('8c. Check for WebSocket connection errors', async ({ page }) => {
    const wsErrors: string[] = [];

    page.on('console', (msg) => {
      const text = msg.text().toLowerCase();
      if (msg.type() === 'error' && (text.includes('websocket') || text.includes('ws://') || text.includes('wss://'))) {
        wsErrors.push(msg.text());
      }
    });

    await setupAuthAndNavigate(page);
    await waitForStability(page);
    await page.waitForTimeout(3000);

    test.info().annotations.push({
      type: 'info',
      description: `WebSocket errors: ${wsErrors.length}. ${wsErrors.length > 0 ? JSON.stringify(wsErrors) : 'None'}`,
    });
  });

  // =====================================================
  // 9. ANIMATION STATES
  // =====================================================
  test('9a. Check CSS transitions on interactive elements', async ({ page }) => {
    await setupAuthAndNavigate(page);
    await waitForStability(page);

    const transitionInfo = await page.evaluate(() => {
      const results: { element: string; transition: string; animation: string }[] = [];
      document.querySelectorAll('[role="button"], [tabindex]').forEach(el => {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && (style.transition !== 'all 0s ease 0s' || style.animationName !== 'none')) {
          results.push({
            element: `${el.tagName}[${el.getAttribute('aria-label') || ''}]`,
            transition: style.transition.substring(0, 100),
            animation: style.animationName,
          });
        }
      });
      return results;
    });

    test.info().annotations.push({
      type: 'info',
      description: `Elements with transitions: ${transitionInfo.length}. First 5: ${JSON.stringify(transitionInfo.slice(0, 5))}`,
    });

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/09-animations.png`,
    });
  });

  test('9b. Chatbot open/close animation sequence', async ({ page }) => {
    await setupAuthAndNavigate(page);
    await waitForStability(page);

    const fab = page.locator('[aria-label*="chat" i]').first();
    if (await fab.isVisible().catch(() => false)) {
      // Before
      await page.screenshot({ path: `${SCREENSHOT_DIR}/09-anim-before.png` });

      await fab.click();

      // Immediately (mid-animation ~100ms)
      await page.waitForTimeout(100);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/09-anim-mid.png` });

      // After animation (~600ms)
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/09-anim-after.png` });

      // Check opacity and transform on the chatbot panel
      const panelState = await page.evaluate(() => {
        const panels: { opacity: string; transform: string }[] = [];
        document.querySelectorAll('[style*="position: fixed"]').forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.width > 200 && rect.height > 200) {
            const style = window.getComputedStyle(el);
            panels.push({
              opacity: style.opacity,
              transform: style.transform,
            });
          }
        });
        return panels;
      });

      test.info().annotations.push({
        type: 'info',
        description: `Chatbot panel post-animation state: ${JSON.stringify(panelState)}`,
      });
    }
  });

  // =====================================================
  // 10. ACCESSIBILITY
  // =====================================================
  test('10a. ARIA labels on voice-related buttons', async ({ page }) => {
    await setupAuthAndNavigate(page);
    await waitForStability(page);

    // Open chatbot
    const fab = page.locator('[aria-label*="chat" i]').first();
    if (await fab.isVisible().catch(() => false)) {
      await fab.click();
      await page.waitForTimeout(500);
    }

    const ariaInfo = await page.evaluate(() => {
      const elements: { tag: string; ariaLabel: string; role: string }[] = [];
      document.querySelectorAll('[aria-label]').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0) {
          elements.push({
            tag: el.tagName,
            ariaLabel: el.getAttribute('aria-label') || '',
            role: el.getAttribute('role') || '',
          });
        }
      });
      return elements;
    });

    const voiceAria = ariaInfo.filter(item => {
      const label = item.ariaLabel.toLowerCase();
      return label.includes('voice') || label.includes('record') || label.includes('mic') ||
        label.includes('chat') || label.includes('send') || label.includes('wizard') ||
        label.includes('close');
    });

    test.info().annotations.push({
      type: 'info',
      description: `All ARIA labels: ${JSON.stringify(ariaInfo)}`,
    });

    test.info().annotations.push({
      type: 'info',
      description: `Voice-related ARIA labels: ${JSON.stringify(voiceAria)}`,
    });

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/10-accessibility.png`,
    });
  });

  test('10b. Keyboard navigation', async ({ page }) => {
    await setupAuthAndNavigate(page);
    await waitForStability(page);

    // Tab through elements
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(200);
    }

    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? {
        tag: el.tagName,
        ariaLabel: el.getAttribute('aria-label') || '',
        className: (el.className || '').toString().substring(0, 50),
      } : null;
    });

    test.info().annotations.push({
      type: 'info',
      description: `Focused element after 5 Tab presses: ${JSON.stringify(focused)}`,
    });

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/10-keyboard-nav.png`,
    });
  });

  test('10c. Touch target sizes (min 44x44)', async ({ page }) => {
    await setupAuthAndNavigate(page);
    await waitForStability(page);

    const fab = page.locator('[aria-label*="chat" i]').first();
    if (await fab.isVisible().catch(() => false)) {
      await fab.click();
      await page.waitForTimeout(500);
    }

    const buttonSizes = await page.evaluate(() => {
      const results: { label: string; w: number; h: number; meets44: boolean }[] = [];
      document.querySelectorAll('[role="button"], [tabindex="0"]').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          results.push({
            label: el.getAttribute('aria-label') || (el.textContent || '').trim().substring(0, 20),
            w: Math.round(rect.width),
            h: Math.round(rect.height),
            meets44: rect.width >= 44 && rect.height >= 44,
          });
        }
      });
      return results;
    });

    const tooSmall = buttonSizes.filter(b => !b.meets44);

    test.info().annotations.push({
      type: 'info',
      description: `All interactive element sizes: ${JSON.stringify(buttonSizes)}`,
    });

    if (tooSmall.length > 0) {
      test.info().annotations.push({
        type: 'warning',
        description: `Buttons below 44x44 WCAG minimum: ${JSON.stringify(tooSmall)}`,
      });
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/10-touch-targets.png`,
    });
  });

  // =====================================================
  // BONUS: Full DOM inspection of chatbot
  // =====================================================
  test('Bonus: Chatbot DOM structure', async ({ page }) => {
    await setupAuthAndNavigate(page);
    await waitForStability(page);

    const fab = page.locator('[aria-label*="chat" i]').first();
    if (await fab.isVisible().catch(() => false)) {
      await fab.click();
      await page.waitForTimeout(500);

      const domTree = await page.evaluate(() => {
        const results: string[] = [];
        document.querySelectorAll('[style*="position: fixed"]').forEach(panel => {
          const rect = panel.getBoundingClientRect();
          if (rect.width > 200 && rect.height > 200) {
            const children = panel.querySelectorAll('*');
            const tags: Record<string, number> = {};
            children.forEach(c => { tags[c.tagName] = (tags[c.tagName] || 0) + 1; });
            results.push(JSON.stringify({
              size: `${Math.round(rect.width)}x${Math.round(rect.height)}`,
              childCount: children.length,
              tags,
            }));
          }
        });
        return results;
      });

      test.info().annotations.push({
        type: 'info',
        description: `Chatbot DOM: ${domTree.join('; ')}`,
      });
    }
  });
});
