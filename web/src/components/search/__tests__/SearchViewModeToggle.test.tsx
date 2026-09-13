/**
 * Test suite for SearchViewModeToggle Component
 * Tests view mode switching (grid/list/cards) and persistence
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { SearchViewModeToggle } from '../SearchViewModeToggle';
import type { ViewMode } from '../../../hooks/useSearchViewMode';

// Mock react-i18next
jest.mock('react-i18next', () => {
  const mockTranslate = (key: string) => key;
  return {
  ...jest.requireActual('react-i18next'),
  useTranslation: () => ({
    i18n: { language: 'en', dir: () => 'ltr' },
    t: mockTranslate,
  }),
};
});

describe('SearchViewModeToggle', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders all three view mode buttons', () => {
    render(
      <SearchViewModeToggle
        value="grid"
        onChange={mockOnChange}
      />
    );

    expect(screen.getByLabelText('search.viewMode.grid')).toBeInTheDocument();
    expect(screen.getByLabelText('search.viewMode.list')).toBeInTheDocument();
    expect(screen.getByLabelText('search.viewMode.cards')).toBeInTheDocument();
  });

  it('highlights grid button when grid mode is active', () => {
    render(
      <SearchViewModeToggle
        value="grid"
        onChange={mockOnChange}
      />
    );

    const gridButton = screen.getByLabelText('search.viewMode.grid');
    expect(gridButton).toHaveAttribute('aria-selected', 'true');
  });

  it('highlights list button when list mode is active', () => {
    render(
      <SearchViewModeToggle
        value="list"
        onChange={mockOnChange}
      />
    );

    const listButton = screen.getByLabelText('search.viewMode.list');
    expect(listButton).toHaveAttribute('aria-selected', 'true');
  });

  it('highlights cards button when cards mode is active', () => {
    render(
      <SearchViewModeToggle
        value="cards"
        onChange={mockOnChange}
      />
    );

    const cardsButton = screen.getByLabelText('search.viewMode.cards');
    expect(cardsButton).toHaveAttribute('aria-selected', 'true');
  });

  it('calls onChange with "list" when list button is pressed', () => {
    render(
      <SearchViewModeToggle
        value="grid"
        onChange={mockOnChange}
      />
    );

    const listButton = screen.getByLabelText('search.viewMode.list');
    fireEvent.click(listButton);

    expect(mockOnChange).toHaveBeenCalledWith('list');
  });

  it('calls onChange with "cards" when cards button is pressed', () => {
    render(
      <SearchViewModeToggle
        value="grid"
        onChange={mockOnChange}
      />
    );

    const cardsButton = screen.getByLabelText('search.viewMode.cards');
    fireEvent.click(cardsButton);

    expect(mockOnChange).toHaveBeenCalledWith('cards');
  });

  it('calls onChange with "grid" when grid button is pressed', () => {
    render(
      <SearchViewModeToggle
        value="list"
        onChange={mockOnChange}
      />
    );

    const gridButton = screen.getByLabelText('search.viewMode.grid');
    fireEvent.click(gridButton);

    expect(mockOnChange).toHaveBeenCalledWith('grid');
  });

  it('renders correct icons for each mode', () => {
    const { container } = render(
      <SearchViewModeToggle
        value="grid"
        onChange={mockOnChange}
      />
    );

    expect(container.textContent).toContain('⊞'); // Grid icon
    expect(container.textContent).toContain('☰'); // List icon
    expect(container.textContent).toContain('▢'); // Cards icon
  });

  it('uses primary variant for selected button', () => {
    render(
      <SearchViewModeToggle
        value="list"
        onChange={mockOnChange}
      />
    );

    const listButton = screen.getByLabelText('search.viewMode.list');
    expect(listButton).toHaveAttribute('aria-selected', 'true');
  });

  it('uses ghost variant for non-selected buttons', () => {
    render(
      <SearchViewModeToggle
        value="list"
        onChange={mockOnChange}
      />
    );

    const gridButton = screen.getByLabelText('search.viewMode.grid');
    const cardsButton = screen.getByLabelText('search.viewMode.cards');

    expect(gridButton).toHaveAttribute('aria-selected', 'false');
    expect(cardsButton).toHaveAttribute('aria-selected', 'false');
  });

  it('has proper accessibility states', () => {
    render(
      <SearchViewModeToggle
        value="grid"
        onChange={mockOnChange}
      />
    );

    const gridButton = screen.getByLabelText('search.viewMode.grid');
    const listButton = screen.getByLabelText('search.viewMode.list');

    expect(gridButton).toHaveAttribute('aria-selected', 'true');
    expect(listButton).toHaveAttribute('aria-selected', 'false');
  });

  it('applies minimum touch target size', () => {
    const { container } = render(
      <SearchViewModeToggle
        value="grid"
        onChange={mockOnChange}
      />
    );

    const buttons = container.querySelectorAll('button');
    buttons.forEach(button => {
      const minSize = Math.max(...Array.from(button.querySelectorAll('*')).map(node => parseInt(window.getComputedStyle(node).minWidth) || 0));
      expect(minSize).toBeGreaterThanOrEqual(44);
    });
  });
});
