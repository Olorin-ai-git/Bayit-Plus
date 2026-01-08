import { init, setKeyMap } from '@noriginmedia/norigin-spatial-navigation';

// Detect if running on LG webOS TV
export function isWebOS(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    navigator.userAgent.includes('Web0S') ||
    navigator.userAgent.includes('webOS') ||
    window.location.search.includes('webos=1')
  );
}

// Detect if running on Samsung Tizen TV
export function isTizen(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    navigator.userAgent.includes('Tizen') ||
    navigator.userAgent.includes('SMART-TV') ||
    typeof (window as any).tizen !== 'undefined' ||
    window.location.search.includes('tizen=1')
  );
}

// Detect if running on any TV platform
export function isTV(): boolean {
  return (
    isWebOS() ||
    isTizen() ||
    window.location.search.includes('tv=1')
  );
}

// Initialize spatial navigation for TV environments
export function initSpatialNav(): void {
  if (typeof window === 'undefined') return;

  console.log('[TV] Initializing spatial navigation...');

  init({
    debug: true, // Enable debug for troubleshooting
    visualDebug: false,
    nativeMode: true, // Use native focus management
    throttle: 0,
  });

  // Map TV remote keys
  // Common keys across platforms + platform-specific
  const keyMap: Record<string, number[]> = {
    left: [37],           // Arrow Left
    right: [39],          // Arrow Right
    up: [38],             // Arrow Up
    down: [40],           // Arrow Down
    enter: [13, 32],      // Enter + Space
  };

  if (isWebOS()) {
    // webOS Magic Remote back button
    keyMap.left.push(461);
  }

  if (isTizen()) {
    // Samsung remote specific keys
    // 10009: Back, 10182: Exit
    keyMap.left.push(10009);
  }

  setKeyMap(keyMap);

  // Register Tizen remote keys if available
  if (isTizen() && typeof (window as any).tizen !== 'undefined') {
    try {
      const tizen = (window as any).tizen;
      if (tizen.tvinputdevice) {
        // Register common TV keys
        const keys = ['MediaPlay', 'MediaPause', 'MediaStop', 'MediaRewind', 'MediaFastForward'];
        keys.forEach(key => {
          try {
            tizen.tvinputdevice.registerKey(key);
          } catch (e) {
            // Key may not be available
          }
        });
      }
    } catch (e) {
      console.warn('Failed to register Tizen remote keys:', e);
    }
  }
}

// Add body class for TV-specific styling
export function setupTVEnvironment(): void {
  if (typeof document === 'undefined') return;

  if (isTV()) {
    console.log('[TV] Setting up TV environment...');
    document.body.classList.add('tv-mode');

    // Disable scrollbars and text selection for TV
    document.body.style.cursor = 'none';
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    document.body.style.overflow = 'hidden';

    // Platform-specific classes
    if (isWebOS()) {
      document.body.classList.add('webOS');
      console.log('[TV] Detected webOS');
    }
    if (isTizen()) {
      document.body.classList.add('tizen');
      console.log('[TV] Detected Tizen');
    }

    // Make all links and buttons focusable for native TV navigation
    makeFocusable();

    // Handle Samsung TV back button
    document.addEventListener('keydown', handleTVKeyDown);
  }
}

// Make interactive elements focusable
function makeFocusable(): void {
  // Add tabIndex to all interactive elements
  const selectors = 'a, button, [role="button"], input, select, textarea, [onclick]';

  const observer = new MutationObserver(() => {
    document.querySelectorAll(selectors).forEach((el) => {
      if (!el.hasAttribute('tabindex')) {
        el.setAttribute('tabindex', '0');
      }
    });
  });

  // Initial pass
  document.querySelectorAll(selectors).forEach((el) => {
    if (!el.hasAttribute('tabindex')) {
      el.setAttribute('tabindex', '0');
    }
  });

  // Watch for new elements
  observer.observe(document.body, { childList: true, subtree: true });
}

// Handle TV-specific key events
function handleTVKeyDown(event: KeyboardEvent): void {
  const keyCode = event.keyCode;

  // Samsung TV Back button (10009) or browser back (461 webOS)
  if (keyCode === 10009 || keyCode === 461) {
    event.preventDefault();
    window.history.back();
    return;
  }

  // Samsung TV Enter/OK button (13)
  if (keyCode === 13) {
    const focused = document.activeElement as HTMLElement;
    if (focused && focused !== document.body) {
      focused.click();
    }
  }

  console.log('[TV] Key pressed:', keyCode);
}
