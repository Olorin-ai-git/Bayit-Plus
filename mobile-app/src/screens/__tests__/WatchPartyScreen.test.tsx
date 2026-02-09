/**
 * WatchPartyScreen Tests
 *
 * Tests rendering, create/join buttons, modals, and party list display.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { WatchPartyScreen } from '../WatchPartyScreen';

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
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts && 'count' in opts) return `${key} (${opts.count})`;
      if (opts && 'name' in opts) return `${key}: ${opts.name}`;
      return key;
    },
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
}));

const mockGetMyParties = jest.fn();
const mockJoinByCode = jest.fn();

jest.mock('@bayit/shared-services/api', () => ({
  partyService: {
    getMyParties: () => mockGetMyParties(),
    joinByCode: (code: string) => mockJoinByCode(code),
  },
}));

jest.mock('@bayit/shared/ui', () => ({
  GlassSpinner: ({ size }: { size: string }) => {
    const { View, Text } = require('react-native');
    return <View testID="glass-spinner"><Text>{size}</Text></View>;
  },
}));

jest.mock('@olorin/glass-ui/native', () => {
  const { View, Text, TextInput, Pressable } = require('react-native');
  return {
    GlassButton: ({ children, onPress, disabled, style }: any) => (
      <Pressable
        testID={`glass-button-${typeof children === 'string' ? children : 'action'}`}
        onPress={onPress}
        disabled={disabled}
      >
        {typeof children === 'string' ? <Text>{children}</Text> : children}
      </Pressable>
    ),
    GlassInput: ({ placeholder, value, onChangeText, ...props }: any) => (
      <TextInput
        testID={`glass-input-${placeholder || 'field'}`}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        {...props}
      />
    ),
    GlassCard: ({ children, style, onPress }: any) => {
      if (onPress) {
        return (
          <Pressable testID="glass-card" onPress={onPress}>
            <View>{children}</View>
          </Pressable>
        );
      }
      return <View testID="glass-card">{children}</View>;
    },
    GlassModal: ({ visible, children, onClose, title }: any) =>
      visible ? (
        <View testID="glass-modal">
          {title && <Text testID="modal-title">{title}</Text>}
          {children}
        </View>
      ) : null,
    GlassErrorBanner: ({ message, onDismiss }: any) => (
      <View testID="glass-error-banner">
        <Text>{message}</Text>
        <Pressable testID="dismiss-error" onPress={onDismiss} />
      </View>
    ),
    GlassBadge: ({ children, variant, size }: any) => (
      <View testID={`glass-badge-${variant}`}>
        {typeof children === 'string' ? <Text>{children}</Text> : children}
      </View>
    ),
    colors: {
      background: '#0d0d1a',
      text: '#ffffff',
      textSecondary: 'rgba(255,255,255,0.7)',
      textMuted: 'rgba(255,255,255,0.5)',
      primary: '#7e22ce',
    },
    spacing: {
      xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24,
    },
    borderRadius: { sm: 4, md: 8, lg: 12, xl: 16 },
  };
});

jest.mock('../../utils/logger', () => ({
  logger: {
    scope: () => ({
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    }),
  },
}));

// --- Tests ---

describe('WatchPartyScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMyParties.mockResolvedValue({ parties: [] });
  });

  describe('loading state', () => {
    it('shows spinner while loading', () => {
      // Keep the promise pending to stay in loading state
      mockGetMyParties.mockReturnValue(new Promise(() => {}));
      const { getByTestId } = render(<WatchPartyScreen />);
      expect(getByTestId('glass-spinner')).toBeTruthy();
    });
  });

  describe('rendering', () => {
    it('renders without crashing', async () => {
      const { toJSON } = render(<WatchPartyScreen />);
      await waitFor(() => {
        expect(toJSON()).toBeTruthy();
      });
    });

    it('displays the screen title', async () => {
      const { getByText } = render(<WatchPartyScreen />);
      await waitFor(() => {
        expect(getByText('watchParty.title')).toBeTruthy();
      });
    });

    it('displays the subtitle', async () => {
      const { getByText } = render(<WatchPartyScreen />);
      await waitFor(() => {
        expect(getByText('watchParty.subtitle')).toBeTruthy();
      });
    });
  });

  describe('action buttons', () => {
    it('renders the Create Party button', async () => {
      const { getByText } = render(<WatchPartyScreen />);
      await waitFor(() => {
        expect(getByText('watchParty.createParty')).toBeTruthy();
      });
    });

    it('renders the Join Party button', async () => {
      const { getByText } = render(<WatchPartyScreen />);
      await waitFor(() => {
        expect(getByText('watchParty.joinParty')).toBeTruthy();
      });
    });
  });

  describe('create modal', () => {
    it('opens create modal when Create Party button is pressed', async () => {
      const { getByText, getByTestId, queryByTestId } = render(<WatchPartyScreen />);

      await waitFor(() => {
        expect(getByText('watchParty.createParty')).toBeTruthy();
      });

      // Modal should not be visible initially
      expect(queryByTestId('glass-modal')).toBeNull();

      // Press create button
      fireEvent.press(getByTestId('glass-button-watchParty.createParty'));

      // Modal should now be visible
      await waitFor(() => {
        expect(getByTestId('glass-modal')).toBeTruthy();
      });
    });
  });

  describe('join modal', () => {
    it('opens join modal when Join Party button is pressed', async () => {
      const { getByText, getByTestId, queryByTestId } = render(<WatchPartyScreen />);

      await waitFor(() => {
        expect(getByText('watchParty.joinParty')).toBeTruthy();
      });

      // Press join button
      fireEvent.press(getByTestId('glass-button-watchParty.joinParty'));

      // Join modal should now be visible with code input
      await waitFor(() => {
        expect(getByTestId('glass-modal')).toBeTruthy();
        expect(getByText('watchParty.enterCode')).toBeTruthy();
      });
    });

    it('renders code input in join modal', async () => {
      const { getByTestId } = render(<WatchPartyScreen />);

      await waitFor(() => {
        expect(getByTestId('glass-button-watchParty.joinParty')).toBeTruthy();
      });

      fireEvent.press(getByTestId('glass-button-watchParty.joinParty'));

      await waitFor(() => {
        expect(getByTestId('glass-input-watchParty.codePlaceholder')).toBeTruthy();
      });
    });

    it('renders cancel button in join modal', async () => {
      const { getByTestId, getByText } = render(<WatchPartyScreen />);

      await waitFor(() => {
        expect(getByTestId('glass-button-watchParty.joinParty')).toBeTruthy();
      });

      fireEvent.press(getByTestId('glass-button-watchParty.joinParty'));

      await waitFor(() => {
        expect(getByText('common.cancel')).toBeTruthy();
      });
    });
  });

  describe('empty state', () => {
    it('shows empty state when no parties exist', async () => {
      mockGetMyParties.mockResolvedValue({ parties: [] });

      const { getByText } = render(<WatchPartyScreen />);

      await waitFor(() => {
        expect(getByText('watchParty.empty.title')).toBeTruthy();
        expect(getByText('watchParty.empty.message')).toBeTruthy();
      });
    });
  });

  describe('party list', () => {
    it('displays active parties section when active parties exist', async () => {
      mockGetMyParties.mockResolvedValue({
        parties: [
          {
            id: 'p1',
            room_code: 'ABCD',
            content_title: 'Movie Night',
            participant_count: 3,
            status: 'active',
            created_at: '2026-02-01T20:00:00Z',
            host_name: 'John',
          },
        ],
      });

      const { getByText } = render(<WatchPartyScreen />);

      await waitFor(() => {
        expect(getByText('watchParty.activeParties')).toBeTruthy();
        expect(getByText('Movie Night')).toBeTruthy();
      });
    });

    it('displays party room code', async () => {
      mockGetMyParties.mockResolvedValue({
        parties: [
          {
            id: 'p1',
            room_code: 'WXYZ',
            content_title: 'Test Party',
            participant_count: 2,
            status: 'active',
            created_at: '2026-02-01T20:00:00Z',
          },
        ],
      });

      const { getByText } = render(<WatchPartyScreen />);

      await waitFor(() => {
        expect(getByText('watchParty.code: WXYZ')).toBeTruthy();
      });
    });

    it('displays participant count', async () => {
      mockGetMyParties.mockResolvedValue({
        parties: [
          {
            id: 'p1',
            room_code: 'TEST',
            content_title: 'Party',
            participant_count: 5,
            status: 'active',
            created_at: '2026-02-01T20:00:00Z',
          },
        ],
      });

      const { getByText } = render(<WatchPartyScreen />);

      await waitFor(() => {
        expect(getByText('watchParty.participants (5)')).toBeTruthy();
      });
    });

    it('displays host name when available', async () => {
      mockGetMyParties.mockResolvedValue({
        parties: [
          {
            id: 'p1',
            room_code: 'HOST',
            content_title: 'Hosted Party',
            participant_count: 2,
            status: 'active',
            created_at: '2026-02-01T20:00:00Z',
            host_name: 'Sarah',
          },
        ],
      });

      const { getByText } = render(<WatchPartyScreen />);

      await waitFor(() => {
        expect(getByText('watchParty.hostedBy: Sarah')).toBeTruthy();
      });
    });

    it('shows live badge for active parties', async () => {
      mockGetMyParties.mockResolvedValue({
        parties: [
          {
            id: 'p1',
            room_code: 'LIVE',
            content_title: 'Active Party',
            participant_count: 3,
            status: 'active',
            created_at: '2026-02-01T20:00:00Z',
          },
        ],
      });

      const { getByText, getByTestId } = render(<WatchPartyScreen />);

      await waitFor(() => {
        expect(getByText('watchParty.status.live')).toBeTruthy();
        expect(getByTestId('glass-badge-success')).toBeTruthy();
      });
    });

    it('displays recent parties section when ended parties exist', async () => {
      mockGetMyParties.mockResolvedValue({
        parties: [
          {
            id: 'p2',
            room_code: 'PAST',
            content_title: 'Previous Party',
            participant_count: 4,
            status: 'ended',
            created_at: '2026-01-30T20:00:00Z',
          },
        ],
      });

      const { getByText } = render(<WatchPartyScreen />);

      await waitFor(() => {
        expect(getByText('watchParty.recentParties')).toBeTruthy();
        expect(getByText('Previous Party')).toBeTruthy();
        expect(getByText('watchParty.status.ended')).toBeTruthy();
      });
    });
  });

  describe('error handling', () => {
    it('displays error banner when loading parties fails', async () => {
      mockGetMyParties.mockRejectedValue(new Error('Network error'));

      const { getByTestId, getByText } = render(<WatchPartyScreen />);

      await waitFor(() => {
        expect(getByTestId('glass-error-banner')).toBeTruthy();
        expect(getByText('watchParty.error.loadFailed')).toBeTruthy();
      });
    });
  });
});
