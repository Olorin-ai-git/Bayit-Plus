/**
 * Test suite for SearchSuggestionsPanel Component
 * Tests trending searches, category chips, recent searches, and XSS protection
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { SearchSuggestionsPanel } from '../SearchSuggestionsPanel';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock sanitization utilities
jest.mock('../../../utils/sanitize', () => ({
  sanitizeText: (text: string) => text.replace(/<[^>]*>/g, ''),
  sanitizeCategory: (category: any) => ({
    ...category,
    name: category.name.replace(/<[^>]*>/g, ''),
  }),
}));

describe('SearchSuggestionsPanel', () => {
  const mockOnSearchSelect = jest.fn();
  const mockOnClearRecent = jest.fn();

  beforeEach(() => {
    mockOnSearchSelect.mockClear();
    mockOnClearRecent.mockClear();
  });

  describe('Trending Searches', () => {
    it('renders trending searches section', () => {
      render(
        <SearchSuggestionsPanel
          trendingSearches={['Action Movies', 'Comedy Shows', 'Drama Series']}
          onSearchSelect={mockOnSearchSelect}
        />
      );

      expect(screen.getByText('suggestions.trendingTitle')).toBeInTheDocument();
      expect(screen.getByText('Action Movies')).toBeInTheDocument();
      expect(screen.getByText('Comedy Shows')).toBeInTheDocument();
      expect(screen.getByText('Drama Series')).toBeInTheDocument();
    });

    it('does not render trending section when empty', () => {
      render(
        <SearchSuggestionsPanel
          trendingSearches={[]}
          onSearchSelect={mockOnSearchSelect}
        />
      );

      expect(screen.queryByText('suggestions.trendingTitle')).not.toBeInTheDocument();
    });

    it('calls onSearchSelect when trending item is pressed', () => {
      render(
        <SearchSuggestionsPanel
          trendingSearches={['Thriller Movies']}
          onSearchSelect={mockOnSearchSelect}
        />
      );

      const trendingItem = screen.getByText('Thriller Movies');
      fireEvent.press(trendingItem);

      expect(mockOnSearchSelect).toHaveBeenCalledWith('Thriller Movies');
    });

    it('sanitizes trending search items', () => {
      render(
        <SearchSuggestionsPanel
          trendingSearches={['<script>alert("xss")</script>Safe Search']}
          onSearchSelect={mockOnSearchSelect}
        />
      );

      expect(screen.getByText('Safe Search')).toBeInTheDocument();
      expect(screen.queryByText(/<script>/)).not.toBeInTheDocument();
    });
  });

  describe('Category Chips', () => {
    const categories = [
      { name: 'Movies', emoji: '🎬' },
      { name: 'Series', emoji: '📺' },
      { name: 'Kids', emoji: '👶' },
    ];

    it('renders category chips section', () => {
      render(
        <SearchSuggestionsPanel
          categories={categories}
          onSearchSelect={mockOnSearchSelect}
        />
      );

      expect(screen.getByText('suggestions.categoriesTitle')).toBeInTheDocument();
      expect(screen.getByText('Movies')).toBeInTheDocument();
      expect(screen.getByText('Series')).toBeInTheDocument();
      expect(screen.getByText('Kids')).toBeInTheDocument();
    });

    it('renders category emojis', () => {
      const { container } = render(
        <SearchSuggestionsPanel
          categories={categories}
          onSearchSelect={mockOnSearchSelect}
        />
      );

      expect(container.textContent).toContain('🎬');
      expect(container.textContent).toContain('📺');
      expect(container.textContent).toContain('👶');
    });

    it('calls onSearchSelect when category is pressed', () => {
      render(
        <SearchSuggestionsPanel
          categories={categories}
          onSearchSelect={mockOnSearchSelect}
        />
      );

      const categoryChip = screen.getByText('Movies');
      fireEvent.press(categoryChip);

      expect(mockOnSearchSelect).toHaveBeenCalledWith('Movies');
    });

    it('does not render categories section when empty', () => {
      render(
        <SearchSuggestionsPanel
          categories={[]}
          onSearchSelect={mockOnSearchSelect}
        />
      );

      expect(screen.queryByText('suggestions.categoriesTitle')).not.toBeInTheDocument();
    });

    it('has proper accessibility label for categories', () => {
      render(
        <SearchSuggestionsPanel
          categories={categories}
          onSearchSelect={mockOnSearchSelect}
        />
      );

      const moviesButton = screen.getByLabelText('Browse Movies');
      expect(moviesButton).toBeInTheDocument();
    });
  });

  describe('Recent Searches', () => {
    it('renders recent searches section', () => {
      render(
        <SearchSuggestionsPanel
          recentSearches={['sci-fi', 'horror', 'documentary']}
          onSearchSelect={mockOnSearchSelect}
          onClearRecent={mockOnClearRecent}
        />
      );

      expect(screen.getByText('suggestions.recentTitle')).toBeInTheDocument();
      expect(screen.getByText('sci-fi')).toBeInTheDocument();
      expect(screen.getByText('horror')).toBeInTheDocument();
      expect(screen.getByText('documentary')).toBeInTheDocument();
    });

    it('renders clear button when onClearRecent is provided', () => {
      render(
        <SearchSuggestionsPanel
          recentSearches={['test']}
          onSearchSelect={mockOnSearchSelect}
          onClearRecent={mockOnClearRecent}
        />
      );

      expect(screen.getByText('suggestions.clearRecent')).toBeInTheDocument();
    });

    it('does not render clear button when onClearRecent is not provided', () => {
      render(
        <SearchSuggestionsPanel
          recentSearches={['test']}
          onSearchSelect={mockOnSearchSelect}
        />
      );

      expect(screen.queryByText('suggestions.clearRecent')).not.toBeInTheDocument();
    });

    it('calls onClearRecent when clear button is pressed', () => {
      render(
        <SearchSuggestionsPanel
          recentSearches={['test']}
          onSearchSelect={mockOnSearchSelect}
          onClearRecent={mockOnClearRecent}
        />
      );

      const clearButton = screen.getByText('suggestions.clearRecent');
      fireEvent.press(clearButton);

      expect(mockOnClearRecent).toHaveBeenCalled();
    });

    it('calls onSearchSelect when recent item is pressed', () => {
      render(
        <SearchSuggestionsPanel
          recentSearches={['animation']}
          onSearchSelect={mockOnSearchSelect}
        />
      );

      const recentItem = screen.getByText('animation');
      fireEvent.press(recentItem);

      expect(mockOnSearchSelect).toHaveBeenCalledWith('animation');
    });

    it('renders recent search icon', () => {
      const { container } = render(
        <SearchSuggestionsPanel
          recentSearches={['test']}
          onSearchSelect={mockOnSearchSelect}
        />
      );

      expect(container.textContent).toContain('🕐');
    });

    it('does not render recent section when empty', () => {
      render(
        <SearchSuggestionsPanel
          recentSearches={[]}
          onSearchSelect={mockOnSearchSelect}
        />
      );

      expect(screen.queryByText('suggestions.recentTitle')).not.toBeInTheDocument();
    });

    it('filters out empty strings from recent searches', () => {
      render(
        <SearchSuggestionsPanel
          recentSearches={['valid', '', 'also valid']}
          onSearchSelect={mockOnSearchSelect}
        />
      );

      expect(screen.getByText('valid')).toBeInTheDocument();
      expect(screen.getByText('also valid')).toBeInTheDocument();
    });
  });

  describe('XSS Protection', () => {
    it('sanitizes recent searches to prevent XSS', () => {
      render(
        <SearchSuggestionsPanel
          recentSearches={['<script>alert("xss")</script>Search']}
          onSearchSelect={mockOnSearchSelect}
        />
      );

      expect(screen.getByText('Search')).toBeInTheDocument();
    });

    it('sanitizes category names to prevent XSS', () => {
      render(
        <SearchSuggestionsPanel
          categories={[{ name: '<img src=x onerror=alert(1)>Movies', emoji: '🎬' }]}
          onSearchSelect={mockOnSearchSelect}
        />
      );

      expect(screen.getByText('Movies')).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('renders all sections when data is provided', () => {
      render(
        <SearchSuggestionsPanel
          trendingSearches={['Trending 1']}
          categories={[{ name: 'Category 1', emoji: '🎬' }]}
          recentSearches={['Recent 1']}
          onSearchSelect={mockOnSearchSelect}
          onClearRecent={mockOnClearRecent}
        />
      );

      expect(screen.getByText('suggestions.trendingTitle')).toBeInTheDocument();
      expect(screen.getByText('suggestions.categoriesTitle')).toBeInTheDocument();
      expect(screen.getByText('suggestions.recentTitle')).toBeInTheDocument();
    });

    it('renders only provided sections', () => {
      render(
        <SearchSuggestionsPanel
          trendingSearches={['Trending 1']}
          onSearchSelect={mockOnSearchSelect}
        />
      );

      expect(screen.getByText('suggestions.trendingTitle')).toBeInTheDocument();
      expect(screen.queryByText('suggestions.categoriesTitle')).not.toBeInTheDocument();
      expect(screen.queryByText('suggestions.recentTitle')).not.toBeInTheDocument();
    });
  });
});
