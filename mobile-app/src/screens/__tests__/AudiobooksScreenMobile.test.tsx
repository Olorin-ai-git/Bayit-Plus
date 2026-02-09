/**
 * AudiobooksScreenMobile Tests
 *
 * Tests rendering, audiobook list display, filtering, and loading states.
 */

import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';

// --- Mocks (must be defined before import) ---

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => {
      if (typeof fallback === 'string') return fallback;
      return key;
    },
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
}));

jest.mock('@bayit/shared-hooks', () => ({
  useDirection: () => ({ isRTL: false, direction: 'ltr' }),
}));

const mockGetAudiobooks = jest.fn();
const mockClearCache = jest.fn().mockResolvedValue(undefined);

jest.mock('@/services/audiobookService', () => ({
  __esModule: true,
  default: {
    getAudiobooks: (...args: any[]) => mockGetAudiobooks(...args),
    clearCache: () => mockClearCache(),
  },
}));

jest.mock('@bayit/shared/ui', () => {
  const { View, Text, Pressable } = require('react-native');
  return {
    GlassView: ({ children, style }: any) => (
      <View testID="glass-view" style={style}>{children}</View>
    ),
    GlassButton: ({ children, onPress, variant, size }: any) => (
      <Pressable
        testID={`glass-button-${typeof children === 'string' ? children : 'action'}`}
        onPress={onPress}
      >
        {typeof children === 'string' ? <Text>{children}</Text> : children}
      </Pressable>
    ),
    GlassSpinner: ({ size }: { size: string }) => (
      <View testID="glass-spinner"><Text>{size}</Text></View>
    ),
  };
});

jest.mock('@olorin/design-tokens', () => ({
  colors: {
    background: '#0d0d1a',
    text: '#ffffff',
    textSecondary: 'rgba(255,255,255,0.7)',
    primary: { DEFAULT: '#7e22ce' },
  },
  spacing: {
    xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24,
  },
  borderRadius: { sm: 4, md: 8, lg: 12, xl: 16 },
}));

jest.mock('../../theme/colors', () => ({
  Colors: {
    Error: { default: '#ef4444' },
  },
}));

jest.mock('../../hooks/useResponsive', () => ({
  useResponsive: () => ({ width: 375, isTablet: false }),
}));

jest.mock('../../hooks/useSafeAreaPadding', () => ({
  useSafeAreaPadding: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Mock AudiobookCardMobile component
jest.mock('../../components/AudiobookCardMobile', () => {
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ audiobook, cardWidth }: any) => (
      <View testID={`audiobook-card-${audiobook.id}`}>
        <Text>{audiobook.title}</Text>
        <Text>{audiobook.author}</Text>
      </View>
    ),
  };
});

// Mock AudiobookFiltersMobile component
jest.mock('../../components/AudiobookFiltersMobile', () => {
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ filters, onChange, isRTL }: any) => (
      <View testID="audiobook-filters"><Text>Filters Panel</Text></View>
    ),
  };
});

jest.mock('@/utils/logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    scope: () => ({
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
    }),
  },
}));

// Import after mocks
import AudiobooksScreenMobile from '../AudiobooksScreenMobile';

// --- Tests ---

describe('AudiobooksScreenMobile', () => {
  const mockNavigation = { navigate: jest.fn(), goBack: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAudiobooks.mockResolvedValue({ items: [] });
  });

  describe('rendering', () => {
    it('renders without crashing', async () => {
      const { toJSON } = render(<AudiobooksScreenMobile navigation={mockNavigation} />);
      await waitFor(() => {
        expect(toJSON()).toBeTruthy();
      });
    });

    it('displays the Audiobooks title', async () => {
      const { getByText } = render(<AudiobooksScreenMobile navigation={mockNavigation} />);
      await waitFor(() => {
        expect(getByText('Audiobooks')).toBeTruthy();
      });
    });

    it('displays the Filter button', async () => {
      const { getByText } = render(<AudiobooksScreenMobile navigation={mockNavigation} />);
      await waitFor(() => {
        expect(getByText('Filter')).toBeTruthy();
      });
    });
  });

  describe('data loading', () => {
    it('calls getAudiobooks on mount', async () => {
      render(<AudiobooksScreenMobile navigation={mockNavigation} />);
      await waitFor(() => {
        expect(mockGetAudiobooks).toHaveBeenCalled();
      });
    });

    it('displays audiobook items when data is loaded', async () => {
      mockGetAudiobooks.mockResolvedValue({
        items: [
          { id: 'ab1', title: 'The Great Book', author: 'Author One' },
          { id: 'ab2', title: 'Another Story', author: 'Author Two' },
        ],
      });

      const { getByText } = render(<AudiobooksScreenMobile navigation={mockNavigation} />);

      await waitFor(() => {
        expect(getByText('The Great Book')).toBeTruthy();
        expect(getByText('Another Story')).toBeTruthy();
      });
    });

    it('displays author names for audiobook items', async () => {
      mockGetAudiobooks.mockResolvedValue({
        items: [
          { id: 'ab1', title: 'Book Title', author: 'Jane Doe' },
        ],
      });

      const { getByText } = render(<AudiobooksScreenMobile navigation={mockNavigation} />);

      await waitFor(() => {
        expect(getByText('Jane Doe')).toBeTruthy();
      });
    });
  });

  describe('empty state', () => {
    it('displays empty message when no audiobooks are found', async () => {
      mockGetAudiobooks.mockResolvedValue({ items: [] });

      const { getByText } = render(<AudiobooksScreenMobile navigation={mockNavigation} />);

      await waitFor(() => {
        expect(getByText('No audiobooks found')).toBeTruthy();
      });
    });
  });

  describe('error state', () => {
    it('displays error message when loading fails', async () => {
      mockGetAudiobooks.mockRejectedValue(new Error('Network error'));

      const { getByText } = render(<AudiobooksScreenMobile navigation={mockNavigation} />);

      await waitFor(() => {
        expect(getByText('Error')).toBeTruthy();
        expect(getByText('Network error')).toBeTruthy();
      });
    });

    it('displays retry button on error', async () => {
      mockGetAudiobooks.mockRejectedValue(new Error('Network error'));

      const { getByText } = render(<AudiobooksScreenMobile navigation={mockNavigation} />);

      await waitFor(() => {
        expect(getByText('Retry')).toBeTruthy();
      });
    });
  });

  describe('filter toggle', () => {
    it('toggles filter panel visibility when Filter button is pressed', async () => {
      const { getByText, queryByTestId } = render(
        <AudiobooksScreenMobile navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Filter')).toBeTruthy();
      });

      // Initially filters panel should not be visible
      expect(queryByTestId('audiobook-filters')).toBeNull();

      // Press filter button
      fireEvent.press(getByText('Filter'));

      // Filters panel should now be visible
      await waitFor(() => {
        expect(queryByTestId('audiobook-filters')).toBeTruthy();
      });
    });
  });
});
