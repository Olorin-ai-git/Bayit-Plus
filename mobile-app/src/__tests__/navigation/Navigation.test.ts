/**
 * Navigation Integration Tests
 * Tests: Screen rendering, navigation transitions, safe area, focus navigation
 * 18 comprehensive tests for Phase 2.3
 */

import {
  verifyNavigationStack,
  verifySafeAreaHandling,
  verifyFocusNavigation,
  verifyModalPresentation,
  verifyTabBarScreens,
  generateNavigationReport,
  ALL_SCREENS,
} from './NavigationVerificationHelper';
import type { NavigableScreen } from './NavigationVerificationHelper';

describe('Navigation Verification - Phase 2.3', () => {
  describe('Screen Registry', () => {
    test('should have all 39 screens defined', () => {
      expect(ALL_SCREENS).toHaveLength(39);
    });

    test('should have 6 unique tab screens', () => {
      const tabScreens = ['Home', 'LiveTV', 'VOD', 'Radio', 'Podcasts', 'Profile'];
      const allTabsPresent = tabScreens.every((tab) => ALL_SCREENS.includes(tab as NavigableScreen));
      expect(allTabsPresent).toBe(true);
    });

    test('should have 3 auth screens', () => {
      const authScreens = ['Login', 'Register', 'ProfileSelection'];
      const allAuthPresent = authScreens.every((auth) => ALL_SCREENS.includes(auth as NavigableScreen));
      expect(allAuthPresent).toBe(true);
    });

    test('should have 3 modal screens', () => {
      const modalScreens = ['Player', 'Search', 'MorningRitual'];
      const allModalsPresent = modalScreens.every((modal) => ALL_SCREENS.includes(modal as NavigableScreen));
      expect(allModalsPresent).toBe(true);
    });
  });

  describe('Safe Area Handling', () => {
    test('should apply safe area to Home screen', () => {
      expect(verifySafeAreaHandling('Home')).toBe(true);
    });

    test('should apply safe area to Player screen', () => {
      expect(verifySafeAreaHandling('Player')).toBe(true);
    });

    test('should apply safe area to all tab screens', () => {
      const tabScreens: NavigableScreen[] = ['Home', 'LiveTV', 'VOD', 'Radio', 'Podcasts', 'Profile'];
      const allHaveSafeArea = tabScreens.every((screen) => verifySafeAreaHandling(screen));
      expect(allHaveSafeArea).toBe(true);
    });

    test('safe area should protect at least 12 main screens', () => {
      const safeAreaScreens = ALL_SCREENS.filter((screen) => verifySafeAreaHandling(screen));
      expect(safeAreaScreens.length).toBeGreaterThanOrEqual(12);
    });
  });

  describe('Focus Navigation (Accessibility)', () => {
    test('should support focus navigation on all screens', () => {
      const focusableScreens = ALL_SCREENS.filter((screen) => verifyFocusNavigation(screen));
      expect(focusableScreens).toHaveLength(39);
    });

    test('focus navigation should include Home screen', () => {
      expect(verifyFocusNavigation('Home')).toBe(true);
    });

    test('focus navigation should include Settings screen', () => {
      expect(verifyFocusNavigation('Settings')).toBe(true);
    });

    test('focus navigation should include Player screen', () => {
      expect(verifyFocusNavigation('Player')).toBe(true);
    });
  });

  describe('Modal Presentation', () => {
    test('Player should be fullScreenModal', () => {
      const modal = verifyModalPresentation('Player');
      expect(modal.isModal).toBe(true);
      expect(modal.animation).toBe('fullScreenModal');
    });

    test('Search should be slide_from_bottom modal', () => {
      const modal = verifyModalPresentation('Search');
      expect(modal.isModal).toBe(true);
      expect(modal.animation).toBe('slide_from_bottom');
    });

    test('Player should be dismissible', () => {
      const modal = verifyModalPresentation('Player');
      expect(modal.dismissible).toBe(true);
    });

    test('Login should not be dismissible', () => {
      const modal = verifyModalPresentation('Login');
      expect(modal.dismissible).toBe(false);
    });

    test('non-modal screens should have correct configuration', () => {
      const modal = verifyModalPresentation('Home');
      expect(modal.isModal).toBe(false);
    });
  });

  describe('Tab Bar Navigation', () => {
    test('should have exactly 6 tab screens', () => {
      const tabs = verifyTabBarScreens();
      expect(tabs).toHaveLength(6);
    });

    test('should have Home at position 0', () => {
      const tabs = verifyTabBarScreens();
      expect(tabs[0]).toEqual({ screen: 'Home', position: 0 });
    });

    test('should have Profile at position 5', () => {
      const tabs = verifyTabBarScreens();
      expect(tabs[5]).toEqual({ screen: 'Profile', position: 5 });
    });

    test('all tab screens should have unique positions', () => {
      const tabs = verifyTabBarScreens();
      const positions = tabs.map((t) => t.position);
      const uniquePositions = new Set(positions);
      expect(uniquePositions.size).toBe(6);
    });

    test('tab positions should be sequential 0-5', () => {
      const tabs = verifyTabBarScreens();
      const positions = tabs.map((t) => t.position).sort((a, b) => a - b);
      expect(positions).toEqual([0, 1, 2, 3, 4, 5]);
    });
  });

  describe('Navigation Report Generation', () => {
    test('should generate valid report', () => {
      const mockResult = {
        totalScreens: 39,
        successfulScreens: 39,
        failedScreens: 0,
        results: [],
        totalRenderTime: 1200,
        allScreensRendered: true,
      };

      const report = generateNavigationReport(mockResult);
      expect(report).toContain('Navigation Verification Report');
      expect(report).toContain('Total Screens: 39');
      expect(report).toContain('Success Rate: 100.0%');
    });

    test('report should include failure details', () => {
      const mockResult = {
        totalScreens: 39,
        successfulScreens: 38,
        failedScreens: 1,
        results: [
          {
            screenName: 'Home' as NavigableScreen,
            rendered: false,
            renderTime: 0,
            errors: ['Screen not found'],
            safeAreaApplied: false,
            focusNavigationWorking: false,
          },
        ],
        totalRenderTime: 1200,
        allScreensRendered: false,
      };

      const report = generateNavigationReport(mockResult);
      expect(report).toContain('Failed Screens:');
      expect(report).toContain('Screen not found');
    });
  });

  describe('Screen Categories', () => {
    test('should have 3 auth screens (Login, Register, ProfileSelection)', () => {
      const authScreens = ALL_SCREENS.filter((s) => ['Login', 'Register', 'ProfileSelection'].includes(s as string));
      expect(authScreens).toHaveLength(3);
    });

    test('should have 4 settings-related screens', () => {
      const settingsScreens = ALL_SCREENS.filter((s) =>
        ['Settings', 'LanguageSettings', 'NotificationSettings', 'VoiceOnboarding'].includes(s as string)
      );
      expect(settingsScreens).toHaveLength(4);
    });

    test('should have 3 account management screens', () => {
      const accountScreens = ALL_SCREENS.filter((s) => ['Billing', 'Subscription', 'Security'].includes(s as string));
      expect(accountScreens).toHaveLength(3);
    });

    test('should have 4 content category screens', () => {
      const contentScreens = ALL_SCREENS.filter((s) =>
        ['Judaism', 'Children', 'Youngsters', 'Watchlist'].includes(s as string)
      );
      expect(contentScreens).toHaveLength(4);
    });

    test('should have 2 detail screens', () => {
      const detailScreens = ALL_SCREENS.filter((s) => ['MovieDetail', 'SeriesDetail'].includes(s as string));
      expect(detailScreens).toHaveLength(2);
    });
  });
});
