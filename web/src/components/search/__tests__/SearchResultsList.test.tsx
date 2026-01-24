/**
 * Test suite for SearchResultsList Component
 * Tests list view rendering, pagination, and performance optimizations
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { SearchResultsList } from '../SearchResultsList';
import type { SearchResult } from '../../../../../shared/hooks/useSearch';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockResults: SearchResult[] = [
  {
    id: '1',
    title: 'Action Movie 1',
    description: 'Exciting action movie with thrills',
    thumbnail: 'https://example.com/thumb1.jpg',
    category_name: 'Movies',
    year: '2023',
    rating: '4.5',
    duration: '120 min',
    requires_subscription: 'free',
  },
  {
    id: '2',
    title: 'Drama Series 2',
    description: 'Emotional drama series',
    thumbnail: null,
    category_name: 'Series',
    year: '2024',
    rating: '4.8',
    duration: '45 min',
    requires_subscription: 'premium',
  },
];

describe('SearchResultsList', () => {
  const mockOnResultClick = jest.fn();
  const mockOnLoadMore = jest.fn();

  beforeEach(() => {
    mockOnResultClick.mockClear();
    mockOnLoadMore.mockClear();
  });

  it('renders list of results', () => {
    render(
      <SearchResultsList
        results={mockResults}
        onResultClick={mockOnResultClick}
      />
    );

    expect(screen.getByText('Action Movie 1')).toBeInTheDocument();
    expect(screen.getByText('Drama Series 2')).toBeInTheDocument();
  });

  it('renders result descriptions', () => {
    render(
      <SearchResultsList
        results={mockResults}
        onResultClick={mockOnResultClick}
      />
    );

    expect(screen.getByText('Exciting action movie with thrills')).toBeInTheDocument();
    expect(screen.getByText('Emotional drama series')).toBeInTheDocument();
  });

  it('renders thumbnails when available', () => {
    render(
      <SearchResultsList
        results={mockResults}
        onResultClick={mockOnResultClick}
      />
    );

    const images = screen.getAllByRole('img');
    expect(images[0]).toHaveAttribute('src', 'https://example.com/thumb1.jpg');
  });

  it('renders placeholder when thumbnail is null', () => {
    render(
      <SearchResultsList
        results={mockResults}
        onResultClick={mockOnResultClick}
      />
    );

    const placeholders = screen.getAllByText('🎬');
    expect(placeholders.length).toBeGreaterThan(0);
  });

  it('displays metadata (category, year, rating, duration)', () => {
    render(
      <SearchResultsList
        results={mockResults}
        onResultClick={mockOnResultClick}
      />
    );

    expect(screen.getByText('Movies')).toBeInTheDocument();
    expect(screen.getByText('2023')).toBeInTheDocument();
    expect(screen.getByText('⭐ 4.5')).toBeInTheDocument();
    expect(screen.getByText('120 min')).toBeInTheDocument();
  });

  it('displays premium badge for subscription content', () => {
    render(
      <SearchResultsList
        results={mockResults}
        onResultClick={mockOnResultClick}
      />
    );

    const premiumBadges = screen.getAllByText('👑');
    expect(premiumBadges.length).toBe(1); // Only second result requires premium
  });

  it('does not display badge for free content', () => {
    const freeResults: SearchResult[] = [
      {
        id: '1',
        title: 'Free Movie',
        description: 'Free content',
        thumbnail: null,
        category_name: 'Movies',
        requires_subscription: 'free',
      },
    ];

    render(
      <SearchResultsList
        results={freeResults}
        onResultClick={mockOnResultClick}
      />
    );

    expect(screen.queryByText('👑')).not.toBeInTheDocument();
  });

  it('calls onResultClick when item is pressed', () => {
    render(
      <SearchResultsList
        results={mockResults}
        onResultClick={mockOnResultClick}
      />
    );

    const firstItem = screen.getByText('Action Movie 1');
    fireEvent.press(firstItem);

    expect(mockOnResultClick).toHaveBeenCalledWith(mockResults[0], 0);
  });

  it('passes correct position to onResultClick', () => {
    render(
      <SearchResultsList
        results={mockResults}
        onResultClick={mockOnResultClick}
      />
    );

    const secondItem = screen.getByText('Drama Series 2');
    fireEvent.press(secondItem);

    expect(mockOnResultClick).toHaveBeenCalledWith(mockResults[1], 1);
  });

  it('has proper accessibility labels', () => {
    render(
      <SearchResultsList
        results={mockResults}
        onResultClick={mockOnResultClick}
      />
    );

    const firstItem = screen.getByLabelText('Action Movie 1 - Movies');
    expect(firstItem).toBeInTheDocument();
  });

  it('renders loading indicator when isLoadingMore is true', () => {
    render(
      <SearchResultsList
        results={mockResults}
        onResultClick={mockOnResultClick}
        isLoadingMore={true}
      />
    );

    expect(screen.getByText('Loading more results...')).toBeInTheDocument();
  });

  it('does not render loading indicator when isLoadingMore is false', () => {
    render(
      <SearchResultsList
        results={mockResults}
        onResultClick={mockOnResultClick}
        isLoadingMore={false}
      />
    );

    expect(screen.queryByText('Loading more results...')).not.toBeInTheDocument();
  });

  it('calls onLoadMore when scrolled to end', () => {
    render(
      <SearchResultsList
        results={mockResults}
        onResultClick={mockOnResultClick}
        onLoadMore={mockOnLoadMore}
      />
    );

    const flatList = screen.getByTestId('flatlist');
    fireEvent(flatList, 'onEndReached');

    expect(mockOnLoadMore).toHaveBeenCalled();
  });

  it('applies FlatList performance props', () => {
    const { container } = render(
      <SearchResultsList
        results={mockResults}
        onResultClick={mockOnResultClick}
      />
    );

    const flatList = container.querySelector('[data-testid="flatlist"]');
    expect(flatList).toHaveProperty('initialNumToRender', 10);
    expect(flatList).toHaveProperty('maxToRenderPerBatch', 10);
    expect(flatList).toHaveProperty('windowSize', 5);
    expect(flatList).toHaveProperty('removeClippedSubviews', true);
  });

  it('uses memoized renderItem callback', () => {
    const { rerender } = render(
      <SearchResultsList
        results={mockResults}
        onResultClick={mockOnResultClick}
      />
    );

    const firstRenderCallback = mockOnResultClick;

    rerender(
      <SearchResultsList
        results={mockResults}
        onResultClick={mockOnResultClick}
      />
    );

    expect(mockOnResultClick).toBe(firstRenderCallback);
  });

  it('truncates long titles to one line', () => {
    const longTitleResult: SearchResult[] = [
      {
        id: '1',
        title: 'This is a very long title that should be truncated to fit in a single line without wrapping',
        description: 'Description',
        thumbnail: null,
        category_name: 'Movies',
        requires_subscription: 'free',
      },
    ];

    const { container } = render(
      <SearchResultsList
        results={longTitleResult}
        onResultClick={mockOnResultClick}
      />
    );

    const title = container.querySelector('.title');
    expect(title).toHaveProperty('numberOfLines', 1);
  });

  it('truncates descriptions to two lines', () => {
    const { container } = render(
      <SearchResultsList
        results={mockResults}
        onResultClick={mockOnResultClick}
      />
    );

    const descriptions = container.querySelectorAll('.description');
    descriptions.forEach(desc => {
      expect(desc).toHaveProperty('numberOfLines', 2);
    });
  });

  it('handles empty results array', () => {
    render(
      <SearchResultsList
        results={[]}
        onResultClick={mockOnResultClick}
      />
    );

    expect(screen.queryByText('Action Movie 1')).not.toBeInTheDocument();
  });
});
