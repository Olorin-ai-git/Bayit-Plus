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

/**
 * Generate accessible label for subtitle language option
 */
export function getSubtitleLanguageLabel(
  languageName: string,
  isSelected: boolean,
  isEnabled: boolean = true
): string {
  let label = languageName

  if (isSelected) {
    label += ', selected'
  }

  if (!isEnabled) {
    label += ', disabled'
  }

  return label
}

/**
 * Generate accessible label for Hebrew mode option
 */
export function getHebrewModeLabel(
  modeName: string,
  isSelected: boolean,
  isAvailable: boolean
): string {
  let label = modeName

  if (isSelected) {
    label += ', currently active'
  }

  if (!isAvailable) {
    label += ', unavailable'
  }

  return label
}

/**
 * Generate accessible hint for iOS VoiceOver
 */
export function getVoiceOverHint(action: string): string {
  return `Double tap to ${action}`
}

/**
 * ARIA role constants
 */
export const ARIA_ROLES = {
  MENU: 'menu',
  MENUITEM: 'menuitem',
  MENUITEMRADIO: 'menuitemradio',
  BUTTON: 'button',
  DIALOG: 'dialog',
  ALERT: 'alert',
  STATUS: 'status',
  OPTION: 'option',
} as const

/**
 * Accessibility state for ARIA attributes
 */
export interface AccessibilityState {
  disabled?: boolean
  selected?: boolean
  checked?: boolean
  expanded?: boolean
  hidden?: boolean
}

/**
 * Generate ARIA attributes from state
 */
export function getAriaAttributes(state: AccessibilityState): Record<string, boolean> {
  const attrs: Record<string, boolean> = {}

  if (state.disabled !== undefined) {
    attrs['aria-disabled'] = state.disabled
  }

  if (state.selected !== undefined) {
    attrs['aria-selected'] = state.selected
  }

  if (state.checked !== undefined) {
    attrs['aria-checked'] = state.checked
  }

  if (state.expanded !== undefined) {
    attrs['aria-expanded'] = state.expanded
  }

  if (state.hidden !== undefined) {
    attrs['aria-hidden'] = state.hidden
  }

  return attrs
}
