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

  // Handle TV remote keys
  document.addEventListener('keydown', (e) => {
    const keyCode = e.keyCode;
    const focused = document.activeElement;
    const isInputElement = focused && (
      focused.tagName === 'INPUT' ||
      focused.tagName === 'TEXTAREA' ||
      focused.tagName === 'SELECT' ||
      focused.isContentEditable
    );

    console.log('[TV] Key pressed:', keyCode, 'Key:', e.key, 'Focused:', focused?.tagName);

    // Samsung Back button (10009) or webOS Back (461) or Escape - ALWAYS handle
    if (keyCode === 10009 || keyCode === 461 || keyCode === 27) {
      e.preventDefault();
      e.stopPropagation();
      // If in input, blur it first
      if (isInputElement) {
        focused.blur();
      }
      window.history.back();
      console.log('[TV] Back button pressed - navigating back');
      return;
    }

    // For input elements, only handle up/down for navigation out
    if (isInputElement) {
      // Allow left/right for text editing in inputs
      if (keyCode === 37 || keyCode === 39) {
        return; // Let input handle left/right
      }
      // Up/Down exits the input
      if (keyCode === 38 || keyCode === 40) {
        e.preventDefault();
        focused.blur();
        findNextFocusable(keyCode === 38 ? 'up' : 'down');
        return;
      }
      // Enter submits forms or moves to next
      if (keyCode === 13) {
        // Check if it's part of a form
        const form = focused.closest('form');
        if (form) {
          // Find submit button and click it
          const submitBtn = form.querySelector('button[type="submit"], button:not([type])');
          if (submitBtn) {
            e.preventDefault();
            submitBtn.click();
            return;
          }
        }
        // Otherwise move to next focusable
        e.preventDefault();
        findNextFocusable('down');
        return;
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
  });

  console.log('[TV] TV mode initialized successfully');
}

// Wrapper component that provides routing context
const BayitWebApp = () => (
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>
);

// Register the app with React Native's AppRegistry
AppRegistry.registerComponent('BayitWeb', () => BayitWebApp);

// Run the application
AppRegistry.runApplication('BayitWeb', {
  rootTag: document.getElementById('root'),
});
