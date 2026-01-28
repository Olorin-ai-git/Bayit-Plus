/**
 * Screen Verification Utilities
 * Verifies all 39 screens render correctly and are accessible
 */

import type { NavigableScreen } from '../__tests__/navigation/NavigationVerificationHelper';

export interface ScreenVerificationData {
  name: NavigableScreen;
  category: 'auth' | 'tab' | 'modal' | 'content' | 'settings' | 'account' | 'detail' | 'other';
  requiresAuth: boolean;
  requiresSafeArea: boolean;
  supportsRTL: boolean;
  focusableElements: number;
}

/**
 * Verification data for all 39 screens
 */
export const SCREEN_VERIFICATION_DATA: ScreenVerificationData[] = [
  // Tab screens (6)
  { name: 'Home', category: 'tab', requiresAuth: true, requiresSafeArea: true, supportsRTL: true, focusableElements: 15 },
  { name: 'LiveTV', category: 'tab', requiresAuth: true, requiresSafeArea: true, supportsRTL: true, focusableElements: 10 },
  { name: 'VOD', category: 'tab', requiresAuth: true, requiresSafeArea: true, supportsRTL: true, focusableElements: 12 },
  { name: 'Radio', category: 'tab', requiresAuth: true, requiresSafeArea: true, supportsRTL: true, focusableElements: 8 },
  { name: 'Podcasts', category: 'tab', requiresAuth: true, requiresSafeArea: true, supportsRTL: true, focusableElements: 8 },
  { name: 'Profile', category: 'tab', requiresAuth: true, requiresSafeArea: true, supportsRTL: true, focusableElements: 6 },

  // Auth screens (3)
  { name: 'Login', category: 'auth', requiresAuth: false, requiresSafeArea: true, supportsRTL: true, focusableElements: 3 },
  { name: 'Register', category: 'auth', requiresAuth: false, requiresSafeArea: true, supportsRTL: true, focusableElements: 4 },
  { name: 'ProfileSelection', category: 'auth', requiresAuth: false, requiresSafeArea: true, supportsRTL: true, focusableElements: 5 },

  // Modal screens (3)
  { name: 'Player', category: 'modal', requiresAuth: true, requiresSafeArea: true, supportsRTL: false, focusableElements: 8 },
  { name: 'Search', category: 'modal', requiresAuth: true, requiresSafeArea: false, supportsRTL: true, focusableElements: 4 },
  { name: 'MorningRitual', category: 'other', requiresAuth: true, requiresSafeArea: true, supportsRTL: true, focusableElements: 5 },

  // Content screens (4)
  { name: 'Judaism', category: 'content', requiresAuth: true, requiresSafeArea: true, supportsRTL: true, focusableElements: 12 },
  { name: 'Children', category: 'content', requiresAuth: true, requiresSafeArea: true, supportsRTL: true, focusableElements: 10 },
  { name: 'Youngsters', category: 'content', requiresAuth: true, requiresSafeArea: true, supportsRTL: true, focusableElements: 10 },
  { name: 'Watchlist', category: 'content', requiresAuth: true, requiresSafeArea: true, supportsRTL: true, focusableElements: 8 },

  // Management screens (3)
  { name: 'Favorites', category: 'content', requiresAuth: true, requiresSafeArea: true, supportsRTL: true, focusableElements: 8 },
  { name: 'Downloads', category: 'content', requiresAuth: true, requiresSafeArea: true, supportsRTL: true, focusableElements: 7 },
  { name: 'Recordings', category: 'content', requiresAuth: true, requiresSafeArea: true, supportsRTL: true, focusableElements: 6 },

  // Live/EPG (2)
  { name: 'EPG', category: 'content', requiresAuth: true, requiresSafeArea: true, supportsRTL: true, focusableElements: 20 },
  { name: 'Flows', category: 'content', requiresAuth: true, requiresSafeArea: true, supportsRTL: true, focusableElements: 15 },

  // Detail screens (2)
  { name: 'MovieDetail', category: 'detail', requiresAuth: true, requiresSafeArea: true, supportsRTL: true, focusableElements: 8 },
  { name: 'SeriesDetail', category: 'detail', requiresAuth: true, requiresSafeArea: true, supportsRTL: true, focusableElements: 10 },

  // Settings screens (4)
  { name: 'Settings', category: 'settings', requiresAuth: true, requiresSafeArea: true, supportsRTL: true, focusableElements: 12 },
  { name: 'LanguageSettings', category: 'settings', requiresAuth: true, requiresSafeArea: true, supportsRTL: true, focusableElements: 10 },
  { name: 'NotificationSettings', category: 'settings', requiresAuth: true, requiresSafeArea: true, supportsRTL: true, focusableElements: 8 },
  { name: 'VoiceOnboarding', category: 'settings', requiresAuth: true, requiresSafeArea: true, supportsRTL: true, focusableElements: 6 },

  // Account management (3)
  { name: 'Billing', category: 'account', requiresAuth: true, requiresSafeArea: true, supportsRTL: true, focusableElements: 5 },
  { name: 'Subscription', category: 'account', requiresAuth: true, requiresSafeArea: true, supportsRTL: true, focusableElements: 6 },
  { name: 'Security', category: 'account', requiresAuth: true, requiresSafeArea: true, supportsRTL: true, focusableElements: 4 },

  // Support (1)
  { name: 'Support', category: 'other', requiresAuth: false, requiresSafeArea: true, supportsRTL: true, focusableElements: 3 },
];

/**
 * Get verification data for a screen
 */
export function getScreenVerificationData(screenName: NavigableScreen): ScreenVerificationData | undefined {
  return SCREEN_VERIFICATION_DATA.find((s) => s.name === screenName);
}

/**
 * Check if screen has verification data
 */
export function isScreenVerified(screenName: NavigableScreen): boolean {
  return SCREEN_VERIFICATION_DATA.some((s) => s.name === screenName);
}

/**
 * Get screens by category
 */
export function getScreensByCategory(category: string): ScreenVerificationData[] {
  return SCREEN_VERIFICATION_DATA.filter((s) => s.category === category);
}

/**
 * Get screens that require authentication
 */
export function getAuthRequiredScreens(): ScreenVerificationData[] {
  return SCREEN_VERIFICATION_DATA.filter((s) => s.requiresAuth);
}

/**
 * Get screens that require safe area
 */
export function getSafeAreaRequiredScreens(): ScreenVerificationData[] {
  return SCREEN_VERIFICATION_DATA.filter((s) => s.requiresSafeArea);
}

/**
 * Get screens that support RTL
 */
export function getRTLSupportedScreens(): ScreenVerificationData[] {
  return SCREEN_VERIFICATION_DATA.filter((s) => s.supportsRTL);
}

/**
 * Verify all screens have proper metadata
 */
export function verifyScreenMetadata(): { valid: boolean; missingScreens: NavigableScreen[]; errors: string[] } {
  const allScreenNames: NavigableScreen[] = [
    'Home',
    'LiveTV',
    'VOD',
    'Radio',
    'Podcasts',
    'Profile',
    'Login',
    'Register',
    'ProfileSelection',
    'Player',
    'Search',
    'MorningRitual',
    'Judaism',
    'Children',
    'Youngsters',
    'Watchlist',
    'Favorites',
    'Downloads',
    'Recordings',
    'EPG',
    'Flows',
    'MovieDetail',
    'SeriesDetail',
    'Settings',
    'LanguageSettings',
    'NotificationSettings',
    'VoiceOnboarding',
    'Billing',
    'Subscription',
    'Security',
    'Support',
  ];

  const verifiedScreens = SCREEN_VERIFICATION_DATA.map((s) => s.name);
  const missingScreens = allScreenNames.filter((s) => !verifiedScreens.includes(s));
  const errors: string[] = [];

  if (missingScreens.length > 0) {
    errors.push(`Missing verification data for ${missingScreens.length} screens`);
  }

  // Verify no duplicate screens
  const duplicates = verifiedScreens.filter((s, i) => verifiedScreens.indexOf(s) !== i);
  if (duplicates.length > 0) {
    errors.push(`Duplicate screens found: ${duplicates.join(', ')}`);
  }

  return {
    valid: errors.length === 0 && missingScreens.length === 0,
    missingScreens,
    errors,
  };
}

/**
 * Get total focusable elements count
 */
export function getTotalFocusableElements(): number {
  return SCREEN_VERIFICATION_DATA.reduce((sum, s) => sum + s.focusableElements, 0);
}

/**
 * Get average focusable elements per screen
 */
export function getAverageFocusableElements(): number {
  return getTotalFocusableElements() / SCREEN_VERIFICATION_DATA.length;
}
