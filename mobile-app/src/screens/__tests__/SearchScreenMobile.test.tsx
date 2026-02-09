/**
 * SearchScreenMobile Tests
 *
 * Tests rendering, search input, filter pills, and result display.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SearchScreenMobile } from '../SearchScreenMobile';

// --- Mocks ---

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
  useRoute: () => ({
    params: {},
  }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts && 'defaultValue' in opts) return opts.defaultValue as string;
      return key;
    },
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
}));

jest.mock('@bayit/shared-hooks', () => ({
  useDirection: () => ({ isRTL: false, direction: 'ltr' }),
}));

jest.mock('react-native-haptic-feedback', () => ({
  trigger: jest.fn(),
}));

jest.mock('@bayit/shared-services', () => ({
  chatService: {
    transcribeAudio: jest.fn().mockResolvedValue('transcribed text'),
  },
}));

jest.mock('@bayit/shared-stores', () => ({
  useAuthStore: (selector: (state: any) => any) => selector({ isPremium: () => false }),
}));

jest.mock('@bayit/shared-utils', () => ({
  getLocalizedName: (item: any, lang: string) => item.title || item.name || '',
}));

jest.mock('@olorin/glass-ui/native', () => {
  const { View, Text } = require('react-native');
  return {
    GlassModal: ({ visible, children, onClose }: any) =>
      visible ? <View testID="glass-modal">{children}</View> : null,
  };
});

jest.mock('@olorin/shared-icons/native', () => ({
  NativeIcon: ({ name, size, color }: any) => {
    const { View } = require('react-native');
    return <View testID={`icon-${name}`} />;
  },
}));

jest.mock('@olorin/design-tokens', () => ({
  colors: {
    background: '#0d0d1a',
    text: '#ffffff',
    textSecondary: 'rgba(255,255,255,0.7)',
    primary: '#7e22ce',
  },
}));

jest.mock('../../theme/colors', () => ({
  Colors: {
    Error: { e400: '#f87171', default: '#ef4444' },
  },
}));

// Mock responsive hooks
jest.mock('../../hooks/useResponsive', () => ({
  useResponsive: () => ({ orientation: 'portrait', width: 375, isTablet: false }),
}));

jest.mock('../../hooks/useSafeAreaPadding', () => ({
  useSafeAreaPadding: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../utils/responsive', () => ({
  getGridColumns: (config: any) => config.phone || 2,
}));

// Mock the shared search hook
const mockSetQuery = jest.fn();
const mockSetFilters = jest.fn();
const mockSearch = jest.fn().mockResolvedValue(undefined);
const mockClearSearch = jest.fn();
const mockTrackResultClick = jest.fn();

jest.mock('../../../../shared/hooks/useSearch', () => ({
  useSearch: () => ({
    query: '',
    setQuery: mockSetQuery,
    filters: { contentTypes: ['vod', 'live', 'radio', 'podcast'] },
    setFilters: mockSetFilters,
    results: [],
    loading: false,
    error: null,
    suggestions: [],
    recentSearches: [],
    search: mockSearch,
    clearSearch: mockClearSearch,
    handleResultClick: mockTrackResultClick,
  }),
}));

// Mock shared search components
jest.mock('../../../../shared/components/search/SearchBar', () => ({
  SearchBar: ({ value, onChange, placeholder, ...props }: any) => {
    const { TextInput } = require('react-native');
    return (
      <TextInput
        testID="search-bar-input"
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
      />
    );
  },
}));

jest.mock('../../../../shared/components/search/SearchFilters', () => ({
  SearchFilters: (props: any) => {
    const { View, Text } = require('react-native');
    return <View testID="search-filters"><Text>Filters</Text></View>;
  },
}));

jest.mock('../../../../shared/components/search/SearchResults', () => ({
  SearchResults: ({ results, loading, emptyMessage, ...props }: any) => {
    const { View, Text } = require('react-native');
    return (
      <View testID="search-results">
        <Text>{loading ? 'Loading...' : emptyMessage}</Text>
      </View>
    );
  },
}));

jest.mock('../../../../shared/components/search/LLMSearchModal', () => ({
  LLMSearchModal: ({ visible, onClose, onSearch, isPremium }: any) => {
    const { View, Text } = require('react-native');
    return visible ? (
      <View testID="llm-search-modal"><Text>AI Search</Text></View>
    ) : null;
  },
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

describe('SearchScreenMobile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders without crashing', () => {
      const { toJSON } = render(<SearchScreenMobile />);
      expect(toJSON()).toBeTruthy();
    });

    it('renders the back button', () => {
      const { getByLabelText } = render(<SearchScreenMobile />);
      expect(getByLabelText('common.back')).toBeTruthy();
    });

    it('renders the AI search button', () => {
      const { getByLabelText } = render(<SearchScreenMobile />);
      expect(getByLabelText('AI Search')).toBeTruthy();
    });
  });

  describe('content type filter pills', () => {
    it('renders all content type filter pills', () => {
      const { getByText } = render(<SearchScreenMobile />);
      expect(getByText('ALL')).toBeTruthy();
      expect(getByText('VOD')).toBeTruthy();
      expect(getByText('LIVE')).toBeTruthy();
      expect(getByText('RADIO')).toBeTruthy();
      expect(getByText('PODCAST')).toBeTruthy();
    });

    it('renders the More Filters button', () => {
      const { getByLabelText } = render(<SearchScreenMobile />);
      expect(getByLabelText('More Filters')).toBeTruthy();
    });
  });

  describe('initial state', () => {
    it('shows search prompt title in initial state', () => {
      const { getByText } = render(<SearchScreenMobile />);
      expect(getByText('Search for Content')).toBeTruthy();
    });

    it('shows search prompt description in initial state', () => {
      const { getByText } = render(<SearchScreenMobile />);
      expect(
        getByText(
          'Search for movies, series, live channels, podcasts, and more. Use advanced filters or smart search for best results.'
        )
      ).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('navigates back when back button is pressed', () => {
      const { getByLabelText } = render(<SearchScreenMobile />);
      const backButton = getByLabelText('common.back');
      fireEvent.press(backButton);
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('premium indicator', () => {
    it('shows premium badge on AI search button for non-premium users', () => {
      const { getByText } = render(<SearchScreenMobile />);
      // The "P" badge indicates premium required
      expect(getByText('P')).toBeTruthy();
    });
  });
});
