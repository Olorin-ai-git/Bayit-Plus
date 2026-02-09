/**
 * SimpleHomeScreenMobile (HomeScreenMobile) Tests
 *
 * Tests rendering, sections, and core UI elements of the home screen.
 * The file exports HomeScreenMobile but the filename is SimpleHomeScreenMobile.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

// --- Mocks (must be defined before import) ---

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: jest.fn(),
  }),
}));

// Mock lucide-react-native icons
jest.mock('lucide-react-native', () => {
  const { View } = require('react-native');
  const createMockIcon = (name: string) => {
    const MockIcon = (props: any) => <View testID={`icon-${name}`} {...props} />;
    MockIcon.displayName = name;
    return MockIcon;
  };
  return {
    Home: createMockIcon('Home'),
    Tv: createMockIcon('Tv'),
    Film: createMockIcon('Film'),
    Radio: createMockIcon('Radio'),
    Mic: createMockIcon('Mic'),
    Play: createMockIcon('Play'),
    ChevronRight: createMockIcon('ChevronRight'),
    ChevronLeft: createMockIcon('ChevronLeft'),
    Clock: createMockIcon('Clock'),
    Star: createMockIcon('Star'),
  };
});

// Mock API services
const mockGetChannels = jest.fn().mockResolvedValue({ channels: [] });
const mockGetFeatured = jest.fn().mockResolvedValue({
  hero: null,
  spotlight: [],
  categories: [],
});

jest.mock('../../services/api', () => ({
  liveService: {
    getChannels: () => mockGetChannels(),
  },
  contentService: {
    getFeatured: () => mockGetFeatured(),
  },
}));

jest.mock('../../theme/colors', () => ({
  Colors: {
    Primary: { default: '#7e22ce', p600: '#9333ea', p900: '#581c87' },
    Dark: { d950: '#000000' },
    Glass: {
      bg: 'rgba(10,10,10,0.7)',
      bgLight: 'rgba(10,10,10,0.5)',
      bgMedium: 'rgba(10,10,10,0.6)',
      border: 'rgba(126,34,206,0.25)',
      borderLight: 'rgba(126,34,206,0.15)',
      purpleLight: 'rgba(88,28,135,0.35)',
      purpleStrong: 'rgba(88,28,135,0.55)',
    },
    Text: {
      primary: '#ffffff',
      secondary: 'rgba(255,255,255,0.7)',
      muted: 'rgba(255,255,255,0.5)',
      disabled: 'rgba(255,255,255,0.3)',
    },
    Warning: { default: '#f59e0b' },
    Special: { live: '#ff4444', gold: '#ffd700' },
    Error: { default: '#ef4444' },
  },
}));

// Import after mocks
import { HomeScreenMobile } from '../SimpleHomeScreenMobile';

// --- Tests ---

describe('SimpleHomeScreenMobile (HomeScreenMobile)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetChannels.mockResolvedValue({ channels: [] });
    mockGetFeatured.mockResolvedValue({
      hero: null,
      spotlight: [],
      categories: [],
    });
  });

  describe('rendering', () => {
    it('renders without crashing', async () => {
      const { toJSON } = render(<HomeScreenMobile />);
      await waitFor(() => {
        expect(toJSON()).toBeTruthy();
      });
    });

    it('displays the Bayit+ logo text', async () => {
      const { getByText } = render(<HomeScreenMobile />);
      await waitFor(() => {
        expect(getByText('Bayit+')).toBeTruthy();
      });
    });
  });

  describe('sections', () => {
    it('displays the Quick Access section', async () => {
      const { getByText } = render(<HomeScreenMobile />);
      await waitFor(() => {
        expect(getByText('Quick Access')).toBeTruthy();
      });
    });

    it('displays the Browse Categories section', async () => {
      const { getByText } = render(<HomeScreenMobile />);
      await waitFor(() => {
        expect(getByText('Browse Categories')).toBeTruthy();
      });
    });

    it('displays the Live TV label', async () => {
      const { getByText } = render(<HomeScreenMobile />);
      await waitFor(() => {
        expect(getByText('Live TV')).toBeTruthy();
      });
    });
  });

  describe('quick access items', () => {
    it('displays Live TV quick access item', async () => {
      const { getAllByText } = render(<HomeScreenMobile />);
      await waitFor(() => {
        // "Live TV" appears in both quick access and as section title
        const elements = getAllByText('Live TV');
        expect(elements.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('displays Movies & Series quick access item', async () => {
      const { getByText } = render(<HomeScreenMobile />);
      await waitFor(() => {
        expect(getByText('Movies & Series')).toBeTruthy();
      });
    });

    it('displays Israeli Radio quick access item', async () => {
      const { getByText } = render(<HomeScreenMobile />);
      await waitFor(() => {
        expect(getByText('Israeli Radio')).toBeTruthy();
      });
    });

    it('displays Podcasts quick access item', async () => {
      const { getByText } = render(<HomeScreenMobile />);
      await waitFor(() => {
        expect(getByText('Podcasts')).toBeTruthy();
      });
    });
  });

  describe('category grid', () => {
    it('displays Movies category', async () => {
      const { getByText } = render(<HomeScreenMobile />);
      await waitFor(() => {
        expect(getByText('Movies')).toBeTruthy();
      });
    });

    it('displays Series category', async () => {
      const { getByText } = render(<HomeScreenMobile />);
      await waitFor(() => {
        expect(getByText('Series')).toBeTruthy();
      });
    });

    it('displays Radio category', async () => {
      const { getByText } = render(<HomeScreenMobile />);
      await waitFor(() => {
        expect(getByText('Radio')).toBeTruthy();
      });
    });
  });

  describe('hero carousel', () => {
    it('shows loading placeholder when no hero items', async () => {
      const { getByText } = render(<HomeScreenMobile />);
      await waitFor(() => {
        expect(getByText('Loading featured content...')).toBeTruthy();
      });
    });

    it('loads data on mount', async () => {
      render(<HomeScreenMobile />);
      await waitFor(() => {
        expect(mockGetChannels).toHaveBeenCalled();
        expect(mockGetFeatured).toHaveBeenCalled();
      });
    });
  });

  describe('with data', () => {
    it('displays channel names when channels are loaded', async () => {
      mockGetChannels.mockResolvedValue({
        channels: [
          { id: 'ch1', name: 'Channel 12', number: 12, logo: null },
          { id: 'ch2', name: 'Channel 13', number: 13, logo: null },
        ],
      });

      const { getByText } = render(<HomeScreenMobile />);

      await waitFor(() => {
        expect(getByText('Channel 12')).toBeTruthy();
        expect(getByText('Channel 13')).toBeTruthy();
      });
    });

    it('displays All Channels link when channels are loaded', async () => {
      mockGetChannels.mockResolvedValue({
        channels: [{ id: 'ch1', name: 'Test Channel', number: 1, logo: null }],
      });

      const { getByText } = render(<HomeScreenMobile />);

      await waitFor(() => {
        expect(getByText('All Channels')).toBeTruthy();
      });
    });

    it('displays featured content when available', async () => {
      mockGetFeatured.mockResolvedValue({
        hero: {
          id: 'hero1',
          title: 'Hero Movie',
          thumbnail: 'https://example.com/hero.jpg',
          backdrop: 'https://example.com/hero-bg.jpg',
          is_series: false,
        },
        spotlight: [],
        categories: [
          {
            name: 'Trending',
            items: [
              {
                id: 'ft1',
                title: 'Featured Film',
                thumbnail: 'https://example.com/ft1.jpg',
                is_series: false,
                year: 2025,
              },
            ],
          },
        ],
      });

      const { getByText } = render(<HomeScreenMobile />);

      await waitFor(() => {
        expect(getByText('Hero Movie')).toBeTruthy();
        expect(getByText('Featured Film')).toBeTruthy();
      });
    });
  });
});
