/**
 * Test suite for SearchResultCard component
 * Tests rendering, badges, genres, press handling, and accessibility.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { SearchResultCard } from '../SearchResultCard';

// Mock react-native
jest.mock('react-native', () => ({
  View: ({ children, style, ...props }: any) => <div style={style} {...props}>{children}</div>,
  Text: ({ children, style, numberOfLines, ...props }: any) => (
    <span style={style} {...props}>{children}</span>
  ),
  Image: ({ source, style, ...props }: any) => (
    <img src={source?.uri} style={style} data-testid="result-image" {...props} />
  ),
  StyleSheet: {
    create: (styles: any) => styles,
    flatten: (s: any) => s,
  },
}));

// Mock design tokens
jest.mock('@olorin/design-tokens', () => ({
  colors: {
    text: '#FFFFFF',
    textMuted: '#999999',
    cardBackground: '#1A1A2E',
    glassOverlayStrong: 'rgba(0,0,0,0.5)',
    primary: { DEFAULT: '#6C63FF' },
  },
  borderRadius: { sm: 4, md: 8, lg: 16 },
  spacing: { sm: 4, md: 8, lg: 16 },
}));

// Mock shared GlassButton
jest.mock('../../../../shared/components/ui/GlassButton', () => ({
  GlassButton: ({ children, onPress, accessibilityLabel, style, ...props }: any) => (
    <button
      onClick={onPress}
      aria-label={accessibilityLabel}
      data-testid="glass-button"
      style={style}
      {...props}
    >
      {children}
    </button>
  ),
}));

// Mock shared icons
jest.mock('@olorin/shared-icons/native', () => ({
  NativeIcon: ({ name, size, color }: any) => (
    <span data-testid={`icon-${name}`} data-size={size} data-color={color}>
      icon-{name}
    </span>
  ),
}));

// Mock sub-components
jest.mock('../SearchCardBadges', () => ({
  SearchCardBadges: ({ requiresSubscription, isKidsContent, isFeatured }: any) => (
    <div data-testid="badges">
      {requiresSubscription && <span data-testid="badge-subscription">Premium</span>}
      {isKidsContent && <span data-testid="badge-kids">Kids</span>}
      {isFeatured && <span data-testid="badge-featured">Featured</span>}
    </div>
  ),
}));

jest.mock('../SearchCardMetadata', () => ({
  SearchCardMetadata: ({ categoryName, year, rating, duration }: any) => (
    <div data-testid="metadata">
      {categoryName && <span>{categoryName}</span>}
      {year && <span>{year}</span>}
      {rating && <span>{rating}</span>}
      {duration && <span>{duration}</span>}
    </div>
  ),
}));

const baseResult = {
  id: 'movie-1',
  title: 'Test Movie',
  description: 'A great movie about testing',
  backdrop: 'https://cdn.bayit.tv/backdrop.jpg',
  thumbnail: 'https://cdn.bayit.tv/thumb.jpg',
  category_id: 'cat-1',
  category_name: 'Movies',
  year: 2025,
  rating: '8.5',
  duration: '2h 15m',
  genres: ['Action', 'Drama', 'Thriller'],
  is_series: false,
  requires_subscription: 'free',
  is_kids_content: false,
  is_featured: false,
  available_subtitle_languages: [] as string[],
  has_subtitles: false,
  view_count: 0,
  avg_rating: 0,
};

describe('SearchResultCard', () => {
  // MARK: - Basic Rendering

  describe('basic rendering', () => {
    it('renders card with title', () => {
      render(<SearchResultCard result={baseResult} position={0} />);
      expect(screen.getByText('Test Movie')).toBeInTheDocument();
    });

    it('renders description', () => {
      render(<SearchResultCard result={baseResult} position={0} />);
      expect(screen.getByText('A great movie about testing')).toBeInTheDocument();
    });

    it('renders backdrop image', () => {
      render(<SearchResultCard result={baseResult} position={0} />);
      const img = screen.getByTestId('result-image');
      expect(img).toHaveAttribute('src', 'https://cdn.bayit.tv/backdrop.jpg');
    });

    it('renders fallback icon when no image', () => {
      const result = { ...baseResult, backdrop: undefined, thumbnail: undefined };
      render(<SearchResultCard result={result} position={0} />);
      expect(screen.getByTestId('icon-vod')).toBeInTheDocument();
    });

    it('uses thumbnail when no backdrop', () => {
      const result = { ...baseResult, backdrop: undefined };
      render(<SearchResultCard result={result} position={0} />);
      const img = screen.getByTestId('result-image');
      expect(img).toHaveAttribute('src', 'https://cdn.bayit.tv/thumb.jpg');
    });
  });

  // MARK: - Description

  describe('description', () => {
    it('omits description when not provided', () => {
      const result = { ...baseResult, description: undefined };
      render(<SearchResultCard result={result} position={0} />);
      expect(screen.queryByText('A great movie about testing')).not.toBeInTheDocument();
    });
  });

  // MARK: - Genres

  describe('genres', () => {
    it('renders up to 3 genres', () => {
      render(<SearchResultCard result={baseResult} position={0} />);
      expect(screen.getByText('Action')).toBeInTheDocument();
      expect(screen.getByText('Drama')).toBeInTheDocument();
      expect(screen.getByText('Thriller')).toBeInTheDocument();
    });

    it('limits to 3 genres even with more', () => {
      const result = {
        ...baseResult,
        genres: ['Action', 'Drama', 'Thriller', 'Sci-Fi', 'Comedy'],
      };
      render(<SearchResultCard result={result} position={0} />);
      expect(screen.queryByText('Sci-Fi')).not.toBeInTheDocument();
      expect(screen.queryByText('Comedy')).not.toBeInTheDocument();
    });

    it('omits genres section when empty', () => {
      const result = { ...baseResult, genres: [] };
      const { container } = render(<SearchResultCard result={result} position={0} />);
      expect(screen.queryByText('Action')).not.toBeInTheDocument();
    });

    it('omits genres section when undefined', () => {
      const result = { ...baseResult, genres: undefined };
      render(<SearchResultCard result={result} position={0} />);
      expect(screen.queryByText('Action')).not.toBeInTheDocument();
    });
  });

  // MARK: - Badges

  describe('badges', () => {
    it('shows subscription badge when required', () => {
      const result = { ...baseResult, requires_subscription: 'premium' };
      render(<SearchResultCard result={result} position={0} />);
      expect(screen.getByTestId('badge-subscription')).toBeInTheDocument();
    });

    it('shows kids badge for kids content', () => {
      const result = { ...baseResult, is_kids_content: true };
      render(<SearchResultCard result={result} position={0} />);
      expect(screen.getByTestId('badge-kids')).toBeInTheDocument();
    });

    it('shows featured badge', () => {
      const result = { ...baseResult, is_featured: true };
      render(<SearchResultCard result={result} position={0} />);
      expect(screen.getByTestId('badge-featured')).toBeInTheDocument();
    });

    it('shows no badges when all false', () => {
      render(<SearchResultCard result={baseResult} position={0} />);
      expect(screen.queryByTestId('badge-subscription')).not.toBeInTheDocument();
      expect(screen.queryByTestId('badge-kids')).not.toBeInTheDocument();
      expect(screen.queryByTestId('badge-featured')).not.toBeInTheDocument();
    });
  });

  // MARK: - Metadata

  describe('metadata', () => {
    it('renders metadata component', () => {
      render(<SearchResultCard result={baseResult} position={0} />);
      expect(screen.getByTestId('metadata')).toBeInTheDocument();
    });

    it('passes metadata fields to sub-component', () => {
      render(<SearchResultCard result={baseResult} position={0} />);
      expect(screen.getByText('Movies')).toBeInTheDocument();
      expect(screen.getByText('2025')).toBeInTheDocument();
    });
  });

  // MARK: - Press Handling

  describe('press handling', () => {
    it('calls onPress with result and position', () => {
      const onPress = jest.fn();
      render(<SearchResultCard result={baseResult} position={3} onPress={onPress} />);

      fireEvent.click(screen.getByTestId('glass-button'));

      expect(onPress).toHaveBeenCalledWith(baseResult, 3);
    });

    it('does not crash when onPress is undefined', () => {
      render(<SearchResultCard result={baseResult} position={0} />);
      fireEvent.click(screen.getByTestId('glass-button'));
      // No error thrown
    });
  });

  // MARK: - Accessibility

  describe('accessibility', () => {
    it('sets accessibility label with title and category', () => {
      render(<SearchResultCard result={baseResult} position={0} />);
      const button = screen.getByTestId('glass-button');
      expect(button).toHaveAttribute('aria-label', 'Test Movie - Movies');
    });

    it('uses fallback category when category_name is missing', () => {
      const result = { ...baseResult, category_name: undefined };
      render(<SearchResultCard result={result} position={0} />);
      const button = screen.getByTestId('glass-button');
      expect(button).toHaveAttribute('aria-label', 'Test Movie - Content');
    });
  });
});
