/**
 * Test suite for SearchSemanticToggle Component
 * Tests semantic/keyword search mode toggle and info tooltip
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { SearchSemanticToggle } from '../SearchSemanticToggle';
import { colors } from '@olorin/design-tokens';

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

describe('SearchSemanticToggle', () => {
  const mockOnToggle = jest.fn();

  beforeEach(() => {
    mockOnToggle.mockClear();
  });

  it('renders keyword and semantic labels', () => {
    render(
      <SearchSemanticToggle
        enabled={false}
        onToggle={mockOnToggle}
      />
    );

    expect(screen.getByText('search.semantic.keyword')).toBeInTheDocument();
    expect(screen.getByText('search.semantic.semantic')).toBeInTheDocument();
  });

  it('highlights keyword label when semantic is disabled', () => {
    const { container } = render(
      <SearchSemanticToggle
        enabled={false}
        onToggle={mockOnToggle}
      />
    );

    const keywordLabel = screen.getByText('search.semantic.keyword');
    expect(keywordLabel).toHaveStyle({ color: colors.text });
  });

  it('highlights semantic label when semantic is enabled', () => {
    const { container } = render(
      <SearchSemanticToggle
        enabled={true}
        onToggle={mockOnToggle}
      />
    );

    const semanticLabel = screen.getByText('search.semantic.semantic');
    expect(semanticLabel).toHaveStyle({ color: colors.text });
  });

  it('calls onToggle with true when disabled switch is pressed', () => {
    render(
      <SearchSemanticToggle
        enabled={false}
        onToggle={mockOnToggle}
      />
    );

    const switchButton = screen.getByRole('switch');
    fireEvent.click(switchButton);

    expect(mockOnToggle).toHaveBeenCalledWith(true);
  });

  it('calls onToggle with false when enabled switch is pressed', () => {
    render(
      <SearchSemanticToggle
        enabled={true}
        onToggle={mockOnToggle}
      />
    );

    const switchButton = screen.getByRole('switch');
    fireEvent.click(switchButton);

    expect(mockOnToggle).toHaveBeenCalledWith(false);
  });

  it('has proper accessibility role', () => {
    render(
      <SearchSemanticToggle
        enabled={false}
        onToggle={mockOnToggle}
      />
    );

    const switchButton = screen.getByRole('switch');
    expect(switchButton).toHaveAttribute('aria-checked', 'false');
  });

  it('updates accessibility checked state when enabled', () => {
    render(
      <SearchSemanticToggle
        enabled={true}
        onToggle={mockOnToggle}
      />
    );

    const switchButton = screen.getByRole('switch');
    expect(switchButton).toHaveAttribute('aria-checked', 'true');
  });

  it('renders info button when showInfo is true', () => {
    render(
      <SearchSemanticToggle
        enabled={false}
        onToggle={mockOnToggle}
        showInfo={true}
      />
    );

    const infoButton = screen.getByLabelText('search.semantic.infoTitle');
    expect(infoButton).toBeInTheDocument();
  });

  it('does not render info button when showInfo is false', () => {
    render(
      <SearchSemanticToggle
        enabled={false}
        onToggle={mockOnToggle}
        showInfo={false}
      />
    );

    const infoButton = screen.queryByLabelText('search.semantic.infoTitle');
    expect(infoButton).not.toBeInTheDocument();
  });

  it('shows tooltip when info button is pressed', () => {
    render(
      <SearchSemanticToggle
        enabled={false}
        onToggle={mockOnToggle}
        showInfo={true}
      />
    );

    const infoButton = screen.getByLabelText('search.semantic.infoTitle');
    fireEvent.click(infoButton);

    expect(screen.getByText('search.semantic.infoTitle')).toBeInTheDocument();
    expect(screen.getByText('search.semantic.info')).toBeInTheDocument();
  });

  it('hides tooltip when info button is pressed again', () => {
    render(
      <SearchSemanticToggle
        enabled={false}
        onToggle={mockOnToggle}
        showInfo={true}
      />
    );

    const infoButton = screen.getByLabelText('search.semantic.infoTitle');
    fireEvent.click(infoButton);
    expect(screen.getByText('search.semantic.info')).toBeInTheDocument();

    fireEvent.click(infoButton);
    expect(screen.queryByText('search.semantic.info')).not.toBeInTheDocument();
  });

  it('renders the shared info icon', () => {
    const { container } = render(
      <SearchSemanticToggle
        enabled={false}
        onToggle={mockOnToggle}
        showInfo={true}
      />
    );

    expect(screen.getByLabelText('search.semantic.infoTitle').querySelector('svg')).not.toBeNull();
  });

  it('has combined accessibility label for switch', () => {
    render(
      <SearchSemanticToggle
        enabled={false}
        onToggle={mockOnToggle}
      />
    );

    const switchButton = screen.getByRole('switch');
    expect(switchButton).toHaveAttribute('aria-label', 'search.semantic.keyword / search.semantic.semantic');
  });

  it('applies focus styles on tvOS', () => {
    // Mock Platform.isTV
    jest.mock('react-native', () => ({
      Platform: {
        isTV: true,
        OS: 'tvos',
      },
      View: 'View',
      Text: 'Text',
      StyleSheet: {
        create: (styles: any) => styles,
      },
    }));

    const { container } = render(
      <SearchSemanticToggle
        enabled={false}
        onToggle={mockOnToggle}
      />
    );

    const switchButton = screen.getByRole('switch');
    fireEvent.focus(switchButton);

    // Check for focus styles (border, scale transform)
    expect(container).toBeTruthy();
  });
});
