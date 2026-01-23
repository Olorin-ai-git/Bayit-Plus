/**
 * Bayit+ Web App Entry Point
 *
 * This entry point uses React Native's AppRegistry for compatibility
 * with React Native Web. During the migration, we keep BrowserRouter
 * for existing pages while gradually migrating to React Navigation.
 */
import { AppRegistry } from 'react-native';
import React from 'react';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import App from './src/App';
import '../shared/styles/globals.css';
import './src/styles/tv.css';
import '@bayit/shared-i18n';

// Check if this is a TV build (set by webpack at build time)
const IS_TV_BUILD = typeof __TV__ !== 'undefined' && __TV__;

// Use HashRouter for TV (no server), BrowserRouter for web
const Router = IS_TV_BUILD ? HashRouter : BrowserRouter;

// Setup TV environment if this is a TV build
if (IS_TV_BUILD && typeof document !== 'undefined') {
  console.log('[TV] Initializing TV mode...');

  // Add TV class to body
  document.body.classList.add('tv-mode');
  document.body.style.cursor = 'none';
  document.body.style.userSelect = 'none';
  document.body.style.overflow = 'hidden';

  // Detect platform
  const isTizen = navigator.userAgent.includes('Tizen') || typeof window.tizen !== 'undefined';
  const isWebOS = navigator.userAgent.includes('Web0S') || navigator.userAgent.includes('webOS');

  if (isTizen) document.body.classList.add('tizen');
  if (isWebOS) document.body.classList.add('webos');
  console.log('[TV] Platform:', isTizen ? 'Tizen' : isWebOS ? 'webOS' : 'Unknown');

  // Register Samsung TV remote keys
  if (isTizen && window.tizen && window.tizen.tvinputdevice) {
    try {
      const keys = ['MediaPlay', 'MediaPause', 'MediaStop', 'MediaRewind', 'MediaFastForward', 'ColorF0Red', 'ColorF1Green', 'ColorF2Yellow', 'ColorF3Blue'];
      keys.forEach(key => {
        try {
          window.tizen.tvinputdevice.registerKey(key);
        } catch (e) { /* Key not available */ }
      });
      console.log('[TV] Registered Tizen remote keys');
    } catch (e) {
      console.warn('[TV] Failed to register Tizen keys:', e);
    }
  }

  // Get all focusable elements
  const getFocusableElements = () => {
    return Array.from(document.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [role="button"]'
    )).filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).display !== 'none';
    });
  };

  // Find nearest element in direction
  const findNextFocusable = (direction) => {
    const focusable = getFocusableElements();
    const current = document.activeElement;

    if (!current || current === document.body) {
      // Focus first element if nothing focused
      if (focusable.length > 0) {
        focusable[0].focus();
      }
      return;
    }

    const currentRect = current.getBoundingClientRect();
    const currentX = currentRect.left + currentRect.width / 2;
    const currentY = currentRect.top + currentRect.height / 2;

    let bestCandidate = null;
    let bestScore = Infinity;

    focusable.forEach(el => {
      if (el === current) return;

      const rect = el.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;

      const dx = x - currentX;
      const dy = y - currentY;

      let isValidDirection = false;
      let primaryDist = 0;
      let secondaryDist = 0;

      switch (direction) {
        case 'up':
          isValidDirection = dy < -10;
          primaryDist = Math.abs(dy);
          secondaryDist = Math.abs(dx);
          break;
        case 'down':
          isValidDirection = dy > 10;
          primaryDist = Math.abs(dy);
          secondaryDist = Math.abs(dx);
          break;
        case 'left':
          isValidDirection = dx < -10;
          primaryDist = Math.abs(dx);
          secondaryDist = Math.abs(dy);
          break;
        case 'right':
          isValidDirection = dx > 10;
          primaryDist = Math.abs(dx);
          secondaryDist = Math.abs(dy);
          break;
      }

      if (isValidDirection) {
        // Prioritize elements that are more aligned
        const score = primaryDist + secondaryDist * 2;
        if (score < bestScore) {
          bestScore = score;
          bestCandidate = el;
        }
      }
    });

    if (bestCandidate) {
      bestCandidate.focus();
      bestCandidate.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  };

  // Make all interactive elements focusable
  const makeFocusable = () => {
    document.querySelectorAll('a, button, [role="button"], input, select, textarea, [onclick]').forEach((el) => {
      if (!el.hasAttribute('tabindex')) {
        el.setAttribute('tabindex', '0');
      }
    });
  };

  // Run on load and observe for new elements
  document.addEventListener('DOMContentLoaded', makeFocusable);
  const observer = new MutationObserver(makeFocusable);
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
    makeFocusable();
  }

  // Focus first element after app loads
  setTimeout(() => {
    const focusable = getFocusableElements();
    if (focusable.length > 0 && document.activeElement === document.body) {
      focusable[0].focus();
      console.log('[TV] Focused first element:', focusable[0]);
    }
  }, 1000);

  // Handle TV remote keys - use capture phase to get events before React
  document.addEventListener('keydown', (e) => {
    const keyCode = e.keyCode;
    const focused = document.activeElement;

    // Check if focused element is an input (check multiple ways)
    const isInputElement = focused && (
      focused.tagName === 'INPUT' ||
      focused.tagName === 'TEXTAREA' ||
      focused.tagName === 'SELECT' ||
      focused.contentEditable === 'true' ||
      focused.getAttribute('role') === 'textbox'
    );

    console.log('[TV] Key pressed:', keyCode, 'Key:', e.key, 'Focused:', focused?.tagName, 'IsInput:', isInputElement);

    // Samsung Back button (10009) or webOS Back (461) or Escape - ALWAYS handle
    if (keyCode === 10009 || keyCode === 461 || keyCode === 27) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      // If in input, blur it first
      if (isInputElement) {
        focused.blur();
      }
      window.history.back();
      console.log('[TV] Back button pressed - navigating back');
      return false;
    }

    // For input elements, handle navigation out
    if (isInputElement) {
      // Allow left/right for text editing in inputs
      if (keyCode === 37 || keyCode === 39) {
        return; // Let input handle left/right
      }

      // Up/Down exits the input and navigates
      if (keyCode === 38 || keyCode === 40) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        // Get current position before blur
        const inputRect = focused.getBoundingClientRect();
        const inputY = inputRect.top + inputRect.height / 2;
        const inputX = inputRect.left + inputRect.width / 2;
        const direction = keyCode === 38 ? 'up' : 'down';

        console.log('[TV] Exiting input, direction:', direction, 'from position:', inputX, inputY);

        // Blur and prevent React from re-focusing
        focused.blur();
        document.body.focus();

        // Find next element after a short delay
        setTimeout(() => {
          // Get all focusable elements except inputs
          const focusable = getFocusableElements().filter(el =>
            el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA'
          );

          console.log('[TV] Found', focusable.length, 'non-input focusable elements');

          let bestCandidate = null;
          let bestScore = Infinity;

          focusable.forEach(el => {
            const rect = el.getBoundingClientRect();
            const x = rect.left + rect.width / 2;
            const y = rect.top + rect.height / 2;
            const dy = y - inputY;
            const dx = x - inputX;

            const isValidDirection = direction === 'up' ? dy < -5 : dy > 5;

            if (isValidDirection) {
              const score = Math.abs(dy) + Math.abs(dx) * 0.5;
              if (score < bestScore) {
                bestScore = score;
                bestCandidate = el;
              }
            }
          });

          // If no element found in direction, find closest overall
          if (!bestCandidate && focusable.length > 0) {
            console.log('[TV] No element in direction, finding closest');
            focusable.forEach(el => {
              const rect = el.getBoundingClientRect();
              const dist = Math.abs(rect.top - inputY) + Math.abs(rect.left - inputX) * 0.5;
              if (dist < bestScore) {
                bestScore = dist;
                bestCandidate = el;
              }
            });
          }

          if (bestCandidate) {
            console.log('[TV] Focusing:', bestCandidate.tagName, bestCandidate.textContent?.substring(0, 20));
            bestCandidate.focus();
            bestCandidate.scrollIntoView({ block: 'nearest', inline: 'nearest' });
          } else {
            console.log('[TV] No focusable element found');
          }
        }, 50);

        return false;
      }

      // Tab key - move to next/previous element
      if (keyCode === 9) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        const inputRect = focused.getBoundingClientRect();
        const direction = e.shiftKey ? 'up' : 'down';

        focused.blur();
        document.body.focus();

        setTimeout(() => {
          const focusable = getFocusableElements().filter(el =>
            el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA'
          );
          if (focusable.length > 0) {
            // Find element above or below based on Tab direction
            const inputY = inputRect.top;
            let best = focusable[0];
            let bestDist = Infinity;

            focusable.forEach(el => {
              const rect = el.getBoundingClientRect();
              const dy = rect.top - inputY;
              const isValid = direction === 'up' ? dy < 0 : dy > 0;
              if (isValid && Math.abs(dy) < bestDist) {
                bestDist = Math.abs(dy);
                best = el;
              }
            });

            best.focus();
          }
        }, 50);
        return false;
      }

      // Enter submits forms or moves to next
      if (keyCode === 13) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        // Check if it's part of a form
        const form = focused.closest('form');
        if (form) {
          // Find submit button and click it
          const submitBtn = form.querySelector('button[type="submit"], button:not([type])');
          if (submitBtn) {
            submitBtn.click();
            return false;
          }
        }
        // Otherwise move to next focusable
        focused.blur();
        document.body.focus();
        setTimeout(() => {
          findNextFocusable('down');
        }, 50);
        return false;
      }
      return; // Let input handle other keys
    }

    // Arrow keys for D-pad navigation (non-input elements)
    switch (keyCode) {
      case 37: // Left
        e.preventDefault();
        findNextFocusable('left');
        return;
      case 38: // Up
        e.preventDefault();
        findNextFocusable('up');
        return;
      case 39: // Right
        e.preventDefault();
        findNextFocusable('right');
        return;
      case 40: // Down
        e.preventDefault();
        findNextFocusable('down');
        return;
    }

    // Enter key - click focused element
    if (keyCode === 13) {
      e.preventDefault();
      if (focused && focused !== document.body) {
        focused.click();
        console.log('[TV] Clicked:', focused);
      }
    }
  }, true); // Use capture phase

  console.log('[TV] TV mode initialized successfully');
}

// Wrapper component that provides routing context
const BayitWebApp = () => (
  <React.StrictMode>
    <SafeAreaProvider>
      <Router>
        <App />
      </Router>
    </SafeAreaProvider>
  </React.StrictMode>
);

// Register the app with React Native's AppRegistry
AppRegistry.registerComponent('BayitWeb', () => BayitWebApp);

// Run the application
AppRegistry.runApplication('BayitWeb', {
  rootTag: document.getElementById('root'),
});
