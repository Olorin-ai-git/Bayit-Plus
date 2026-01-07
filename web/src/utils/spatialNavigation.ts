import { init, setKeyMap } from '@noriginmedia/norigin-spatial-navigation';

// Detect if running on webOS TV
export function isWebOS(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    navigator.userAgent.includes('Web0S') ||
    navigator.userAgent.includes('webOS') ||
    window.location.search.includes('tv=1')
  );
}

// Initialize spatial navigation for TV environments
export function initSpatialNav(): void {
  if (typeof window === 'undefined') return;

  init({
    debug: false,
    visualDebug: false,
    nativeMode: false,
    throttle: 0,
  });

  // Map webOS Magic Remote and standard remote keys
  setKeyMap({
    left: [37, 461],      // Arrow Left + webOS Back
    right: [39],          // Arrow Right
    up: [38],             // Arrow Up
    down: [40],           // Arrow Down
    enter: [13, 32],      // Enter + Space
  });
}

// Add body class for TV-specific styling
export function setupTVEnvironment(): void {
  if (typeof document === 'undefined') return;

  if (isWebOS()) {
    document.body.classList.add('webOS');
    document.body.classList.add('tv-mode');

    // Disable scrollbars and text selection for TV
    document.body.style.cursor = 'none';
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    document.body.style.overflow = 'hidden';
  }
}
