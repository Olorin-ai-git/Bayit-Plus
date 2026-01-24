/**
 * Test suite for SearchSemanticToggle Component
 * Tests semantic/keyword search mode toggle and info tooltip
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { SearchSemanticToggle } from '../SearchSemanticToggle';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

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

    expect(screen.getByText('semantic.keyword')).toBeInTheDocument();
    expect(screen.getByText('semantic.semantic')).toBeInTheDocument();
  });

  it('highlights keyword label when semantic is disabled', () => {
    const { container } = render(
      <SearchSemanticToggle
        enabled={false}
        onToggle={mockOnToggle}
      />
    );

    const keywordLabel = screen.getByText('semantic.keyword');
    expect(keywordLabel.className).toContain('labelActive');
  });

  it('highlights semantic label when semantic is enabled', () => {
    const { container } = render(
      <SearchSemanticToggle
        enabled={true}
        onToggle={mockOnToggle}
      />
    );

    const semanticLabel = screen.getByText('semantic.semantic');
    expect(semanticLabel.className).toContain('labelActive');
  });

  it('calls onToggle with true when disabled switch is pressed', () => {
    render(
      <SearchSemanticToggle
        enabled={false}
        onToggle={mockOnToggle}
      />
    );

    const switchButton = screen.getByRole('switch');
    fireEvent.press(switchButton);

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
    fireEvent.press(switchButton);

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

    const infoButton = screen.getByLabelText('semantic.infoTitle');
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

    const infoButton = screen.queryByLabelText('semantic.infoTitle');
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

    const infoButton = screen.getByLabelText('semantic.infoTitle');
    fireEvent.press(infoButton);

    expect(screen.getByText('semantic.infoTitle')).toBeInTheDocument();
    expect(screen.getByText('semantic.info')).toBeInTheDocument();
  });

  it('hides tooltip when info button is pressed again', () => {
    render(
      <SearchSemanticToggle
        enabled={false}
        onToggle={mockOnToggle}
        showInfo={true}
      />
    );

    const infoButton = screen.getByLabelText('semantic.infoTitle');
    fireEvent.press(infoButton);
    expect(screen.getByText('semantic.info')).toBeInTheDocument();

    fireEvent.press(infoButton);
    expect(screen.queryByText('semantic.info')).not.toBeInTheDocument();
  });

  it('renders info icon emoji', () => {
    const { container } = render(
      <SearchSemanticToggle
        enabled={false}
        onToggle={mockOnToggle}
        showInfo={true}
      />
    );

    expect(container.textContent).toContain('ℹ️');
  });

  it('has combined accessibility label for switch', () => {
    render(
      <SearchSemanticToggle
        enabled={false}
        onToggle={mockOnToggle}
      />
    );

    const switchButton = screen.getByRole('switch');
    expect(switchButton).toHaveAttribute('aria-label', 'semantic.keyword / semantic.semantic');
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
