/**
 * Accessibility Utilities
 * Screen reader announcements and ARIA live regions
 */

/**
 * Announce a message to screen readers
 * Creates or updates an ARIA live region for assistive technology
 *
 * @param message - The message to announce
 * @param options - Configuration options
 * @param options.assertive - If true, uses 'assertive' politeness (interrupts current speech)
 * @param options.delay - Delay in ms before announcing (default: 100ms for reliability)
 */
export function announceToScreenReader(
  message: string,
  options: {
    assertive?: boolean;
    delay?: number;
  } = {}
): void {
  const { assertive = false, delay = 100 } = options;

  // Create or get existing live region
  let liveRegion = document.getElementById('a11y-live-region');

  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = 'a11y-live-region';
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');

    // Visually hidden but accessible to screen readers
    liveRegion.style.position = 'absolute';
    liveRegion.style.left = '-10000px';
    liveRegion.style.width = '1px';
    liveRegion.style.height = '1px';
    liveRegion.style.overflow = 'hidden';

    document.body.appendChild(liveRegion);
  }

  // Update politeness level if assertive
  if (assertive) {
    liveRegion.setAttribute('aria-live', 'assertive');
  } else {
    liveRegion.setAttribute('aria-live', 'polite');
  }

  // Clear and announce with delay for screen reader reliability
  liveRegion.textContent = '';

  setTimeout(() => {
    if (liveRegion) {
      liveRegion.textContent = message;
    }
  }, delay);
}

/**
 * Get language name in the target language (native name)
 * Used for screen reader announcements
 */
export function getLanguageName(langCode: string): string {
  const languageNames: Record<string, string> = {
    en: 'English',
    he: 'עברית',
    es: 'Español',
    zh: '中文',
    fr: 'Français',
    it: 'Italiano',
    hi: 'हिन्दी',
    ta: 'தமிழ்',
    bn: 'বাংলা',
    ja: '日本語',
    ar: 'العربية',
  };

  return languageNames[langCode] || langCode;
}

/**
 * Clear all live region announcements
 * Useful when navigating away or unmounting components
 */
export function clearScreenReaderAnnouncements(): void {
  const liveRegion = document.getElementById('a11y-live-region');
  if (liveRegion) {
    liveRegion.textContent = '';
  }
}
