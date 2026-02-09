/**
 * ProfileScreenMobile Tests
 *
 * Tests rendering, profile info display, menu items, and user actions.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { ProfileScreenMobile } from '../ProfileScreenMobile';

// --- Mocks ---

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
}));

jest.mock('react-native-haptic-feedback', () => ({
  trigger: jest.fn(),
}));

const mockLogout = jest.fn().mockResolvedValue(undefined);

jest.mock('@bayit/shared-stores', () => ({
  useAuthStore: () => ({
    user: {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
      avatar: null,
      subscription_tier: 'premium',
      email_verified: true,
      phone_verified: false,
    },
    logout: mockLogout,
    isAdminRole: () => false,
    isVerified: () => true,
    needsVerification: () => true,
  }),
}));

jest.mock('@bayit/shared-hooks', () => ({
  usePermissions: () => ({ can: jest.fn().mockReturnValue(true), isAdmin: false }),
  useDirection: () => ({ isRTL: false, direction: 'ltr' }),
}));

const mockGetStats = jest.fn().mockResolvedValue({
  playlist_count: 12,
  favorites_count: 25,
  downloads_count: 8,
  watch_time_minutes: 480,
});

jest.mock('@bayit/shared-services', () => ({
  profilesService: {
    getStats: () => mockGetStats(),
  },
}));

jest.mock('@bayit/shared', () => {
  const { View, Text, Pressable } = require('react-native');
  return {
    GlassView: ({ children, style }: any) => (
      <View testID="glass-view" style={style}>{children}</View>
    ),
    GlassButton: ({ children, onPress, variant, style, title }: any) => (
      <Pressable
        testID={`glass-button-${typeof children === 'string' ? children : title || variant || 'action'}`}
        onPress={onPress}
      >
        {typeof children === 'string' ? <Text>{children}</Text> : children}
        {title && <Text>{title}</Text>}
      </Pressable>
    ),
  };
});

jest.mock('@bayit/shared/components/VerificationModal', () => ({
  VerificationModal: ({ visible, onClose, onSuccess }: any) => {
    const { View, Text } = require('react-native');
    return visible ? (
      <View testID="verification-modal"><Text>Verification</Text></View>
    ) : null;
  },
}));

jest.mock('@bayit/shared/components/UpgradeButton', () => ({
  UpgradeButton: ({ fullWidth }: any) => {
    const { View, Text } = require('react-native');
    return <View testID="upgrade-button"><Text>Upgrade</Text></View>;
  },
}));

jest.mock('@olorin/design-tokens', () => ({
  spacing: {
    xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32,
  },
  colors: {
    background: '#0d0d1a',
    text: '#ffffff',
    textSecondary: 'rgba(255,255,255,0.7)',
    textMuted: 'rgba(255,255,255,0.5)',
    primary: '#7e22ce',
  },
  typography: {
    h1: { fontSize: 32 },
    h2: { fontSize: 24 },
    h3: { fontSize: 20 },
    body: { fontSize: 16 },
    caption: { fontSize: 12 },
  },
  touchTarget: { minHeight: 44 },
}));

jest.mock('../../theme/colors', () => ({
  Colors: {
    Success: { default: '#10b981' },
    Error: { default: '#ef4444' },
  },
}));

jest.mock('../../hooks/useResponsive', () => ({
  useResponsive: () => ({ isTablet: false, width: 375 }),
}));

jest.mock('../../hooks/useScaledFontSize', () => ({
  useScaledFontSize: () => (size: number) => size,
}));

jest.mock('@/utils/logger', () => ({
  __esModule: true,
  default: {
    scope: () => ({
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    }),
  },
}));

// --- Tests ---

describe('ProfileScreenMobile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetStats.mockResolvedValue({
      playlist_count: 12,
      favorites_count: 25,
      downloads_count: 8,
      watch_time_minutes: 480,
    });
  });

  describe('rendering', () => {
    it('renders without crashing', async () => {
      const { toJSON } = render(<ProfileScreenMobile />);
      await waitFor(() => {
        expect(toJSON()).toBeTruthy();
      });
    });
  });

  describe('profile header', () => {
    it('displays the user name', async () => {
      const { getByText } = render(<ProfileScreenMobile />);
      await waitFor(() => {
        expect(getByText('Test User')).toBeTruthy();
      });
    });

    it('displays the user email', async () => {
      const { getByText } = render(<ProfileScreenMobile />);
      await waitFor(() => {
        expect(getByText('test@example.com')).toBeTruthy();
      });
    });

    it('displays avatar initial when no avatar image', async () => {
      const { getByText } = render(<ProfileScreenMobile />);
      await waitFor(() => {
        expect(getByText('T')).toBeTruthy();
      });
    });

    it('displays subscription badge', async () => {
      const { getByText } = render(<ProfileScreenMobile />);
      await waitFor(() => {
        expect(getByText('PREMIUM')).toBeTruthy();
      });
    });
  });

  describe('verification status', () => {
    it('displays email verification badge', async () => {
      const { getByText } = render(<ProfileScreenMobile />);
      await waitFor(() => {
        expect(getByText('profile.emailVerified')).toBeTruthy();
      });
    });

    it('displays phone unverified badge', async () => {
      const { getByText } = render(<ProfileScreenMobile />);
      await waitFor(() => {
        expect(getByText('profile.phoneUnverified')).toBeTruthy();
      });
    });

    it('shows complete verification button when verification needed', async () => {
      const { getByText } = render(<ProfileScreenMobile />);
      await waitFor(() => {
        expect(getByText('profile.completeVerification')).toBeTruthy();
      });
    });
  });

  describe('stats grid', () => {
    it('loads profile stats on mount', async () => {
      render(<ProfileScreenMobile />);
      await waitFor(() => {
        expect(mockGetStats).toHaveBeenCalled();
      });
    });

    it('displays watch time stat label', async () => {
      const { getByText } = render(<ProfileScreenMobile />);
      await waitFor(() => {
        expect(getByText('profile.watchTime')).toBeTruthy();
      });
    });

    it('displays favorites stat label', async () => {
      const { getByText } = render(<ProfileScreenMobile />);
      await waitFor(() => {
        expect(getByText('profile.favorites')).toBeTruthy();
      });
    });

    it('displays playlist stat label', async () => {
      const { getByText } = render(<ProfileScreenMobile />);
      await waitFor(() => {
        expect(getByText('profile.playlist')).toBeTruthy();
      });
    });

    it('displays downloads stat label', async () => {
      const { getByText } = render(<ProfileScreenMobile />);
      await waitFor(() => {
        expect(getByText('profile.downloads')).toBeTruthy();
      });
    });

    it('displays numeric stat values after loading', async () => {
      const { getByText } = render(<ProfileScreenMobile />);
      await waitFor(() => {
        expect(getByText('25')).toBeTruthy(); // favorites
        expect(getByText('12')).toBeTruthy(); // playlist
        expect(getByText('8')).toBeTruthy();  // downloads
      });
    });
  });

  describe('menu items', () => {
    it('displays playlist menu item', async () => {
      const { getAllByText } = render(<ProfileScreenMobile />);
      await waitFor(() => {
        // "profile.playlist" appears as both stat label and menu item
        const elements = getAllByText('profile.playlist');
        expect(elements.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('displays subscription menu item', async () => {
      const { getByText } = render(<ProfileScreenMobile />);
      await waitFor(() => {
        expect(getByText('profile.subscription')).toBeTruthy();
      });
    });

    it('displays billing menu item', async () => {
      const { getByText } = render(<ProfileScreenMobile />);
      await waitFor(() => {
        expect(getByText('profile.billing')).toBeTruthy();
      });
    });

    it('displays security menu item', async () => {
      const { getByText } = render(<ProfileScreenMobile />);
      await waitFor(() => {
        expect(getByText('profile.security')).toBeTruthy();
      });
    });

    it('displays settings menu item', async () => {
      const { getByText } = render(<ProfileScreenMobile />);
      await waitFor(() => {
        expect(getByText('profile.settings')).toBeTruthy();
      });
    });

    it('displays language menu item with current language', async () => {
      const { getByText } = render(<ProfileScreenMobile />);
      await waitFor(() => {
        expect(getByText('profile.language')).toBeTruthy();
        expect(getByText('English')).toBeTruthy();
      });
    });

    it('displays notifications menu item', async () => {
      const { getByText } = render(<ProfileScreenMobile />);
      await waitFor(() => {
        expect(getByText('profile.notifications')).toBeTruthy();
      });
    });
  });

  describe('navigation from menu', () => {
    it('navigates to Settings when settings menu item is pressed', async () => {
      const { getByLabelText } = render(<ProfileScreenMobile />);

      await waitFor(() => {
        expect(getByLabelText('profile.settings')).toBeTruthy();
      });

      fireEvent.press(getByLabelText('profile.settings'));
      expect(mockNavigate).toHaveBeenCalledWith('Settings');
    });

    it('navigates to Security when security menu item is pressed', async () => {
      const { getByLabelText } = render(<ProfileScreenMobile />);

      await waitFor(() => {
        expect(getByLabelText('profile.security')).toBeTruthy();
      });

      fireEvent.press(getByLabelText('profile.security'));
      expect(mockNavigate).toHaveBeenCalledWith('Security');
    });
  });

  describe('logout', () => {
    it('displays the logout button', async () => {
      const { getByText } = render(<ProfileScreenMobile />);
      await waitFor(() => {
        expect(getByText('profile.logout')).toBeTruthy();
      });
    });

    it('calls logout when logout button is pressed', async () => {
      const { getByTestId } = render(<ProfileScreenMobile />);

      await waitFor(() => {
        expect(getByTestId('glass-button-profile.logout')).toBeTruthy();
      });

      fireEvent.press(getByTestId('glass-button-profile.logout'));
      expect(mockLogout).toHaveBeenCalled();
    });
  });

  describe('app version', () => {
    it('displays app version text', async () => {
      const { getByText } = render(<ProfileScreenMobile />);
      await waitFor(() => {
        expect(getByText('common.appVersion')).toBeTruthy();
      });
    });
  });
});
