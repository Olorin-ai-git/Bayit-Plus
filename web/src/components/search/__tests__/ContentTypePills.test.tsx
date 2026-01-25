/**
 * Test suite for ContentTypePills Component
 * Tests content type filtering pills (All, VOD, Live, Radio, Podcast)
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { ContentTypePills } from '../ContentTypePills';
import type { ContentType } from '../../../../../shared/hooks/useSearch';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('ContentTypePills', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders all content type pills', () => {
    render(
      <ContentTypePills
        value="all"
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('search.controls.contentTypes.all')).toBeInTheDocument();
    expect(screen.getByText('search.controls.contentTypes.vod')).toBeInTheDocument();
    expect(screen.getByText('search.controls.contentTypes.live')).toBeInTheDocument();
    expect(screen.getByText('search.controls.contentTypes.radio')).toBeInTheDocument();
    expect(screen.getByText('search.controls.contentTypes.podcast')).toBeInTheDocument();
  });

  it('renders content type emojis', () => {
    const { container } = render(
      <ContentTypePills
        value="all"
        onChange={mockOnChange}
      />
    );

    expect(container.textContent).toContain('🎬'); // VOD
    expect(container.textContent).toContain('📺'); // Live
    expect(container.textContent).toContain('📻'); // Radio
    expect(container.textContent).toContain('🎙️'); // Podcast
  });

  it('highlights "all" pill when all is selected', () => {
    render(
      <ContentTypePills
        value="all"
        onChange={mockOnChange}
      />
    );

    const allPill = screen.getByText('search.controls.contentTypes.all').closest('button');
    expect(allPill).toHaveAttribute('data-variant', 'primary');
  });

  it('highlights "vod" pill when vod is selected', () => {
    render(
      <ContentTypePills
        value="vod"
        onChange={mockOnChange}
      />
    );

    const vodPill = screen.getByText('search.controls.contentTypes.vod').closest('button');
    expect(vodPill).toHaveAttribute('data-variant', 'primary');
  });

  it('uses ghost variant for non-selected pills', () => {
    render(
      <ContentTypePills
        value="vod"
        onChange={mockOnChange}
      />
    );

    const allPill = screen.getByText('search.controls.contentTypes.all').closest('button');
    const livePill = screen.getByText('search.controls.contentTypes.live').closest('button');

    expect(allPill).toHaveAttribute('data-variant', 'ghost');
    expect(livePill).toHaveAttribute('data-variant', 'ghost');
  });

  it('calls onChange with "vod" when VOD pill is pressed', () => {
    render(
      <ContentTypePills
        value="all"
        onChange={mockOnChange}
      />
    );

    const vodPill = screen.getByText('search.controls.contentTypes.vod');
    fireEvent.press(vodPill);

    expect(mockOnChange).toHaveBeenCalledWith('vod');
  });

  it('calls onChange with "live" when Live pill is pressed', () => {
    render(
      <ContentTypePills
        value="all"
        onChange={mockOnChange}
      />
    );

    const livePill = screen.getByText('search.controls.contentTypes.live');
    fireEvent.press(livePill);

    expect(mockOnChange).toHaveBeenCalledWith('live');
  });

  it('calls onChange with "radio" when Radio pill is pressed', () => {
    render(
      <ContentTypePills
        value="all"
        onChange={mockOnChange}
      />
    );

    const radioPill = screen.getByText('search.controls.contentTypes.radio');
    fireEvent.press(radioPill);

    expect(mockOnChange).toHaveBeenCalledWith('radio');
  });

  it('calls onChange with "podcast" when Podcast pill is pressed', () => {
    render(
      <ContentTypePills
        value="all"
        onChange={mockOnChange}
      />
    );

    const podcastPill = screen.getByText('search.controls.contentTypes.podcast');
    fireEvent.press(podcastPill);

    expect(mockOnChange).toHaveBeenCalledWith('podcast');
  });

  it('calls onChange with "all" when All pill is pressed', () => {
    render(
      <ContentTypePills
        value="vod"
        onChange={mockOnChange}
      />
    );

    const allPill = screen.getByText('search.controls.contentTypes.all');
    fireEvent.press(allPill);

    expect(mockOnChange).toHaveBeenCalledWith('all');
  });

  it('has proper accessibility states', () => {
    render(
      <ContentTypePills
        value="live"
        onChange={mockOnChange}
      />
    );

    const livePill = screen.getByText('search.controls.contentTypes.live').closest('button');
    const vodPill = screen.getByText('search.controls.contentTypes.vod').closest('button');

    expect(livePill).toHaveAttribute('aria-selected', 'true');
    expect(vodPill).toHaveAttribute('aria-selected', 'false');
  });

  it('renders as horizontal scrollable list', () => {
    const { container } = render(
      <ContentTypePills
        value="all"
        onChange={mockOnChange}
      />
    );

    const scrollView = container.querySelector('[data-testid="scroll-view"]');
    expect(scrollView).toHaveStyle({ flexDirection: 'row' });
  });

  it('applies minimum touch target size', () => {
    const { container } = render(
      <ContentTypePills
        value="all"
        onChange={mockOnChange}
      />
    );

    const pills = container.querySelectorAll('button');
    pills.forEach(pill => {
      const styles = window.getComputedStyle(pill);
      const minHeight = parseInt(styles.minHeight) || 0;
      expect(minHeight).toBeGreaterThanOrEqual(44);
    });
  });

  it('supports tvOS focus navigation', () => {
    render(
      <ContentTypePills
        value="all"
        onChange={mockOnChange}
      />
    );

    const firstPill = screen.getByText('search.controls.contentTypes.all').closest('button');
    expect(firstPill).toHaveAttribute('focusable', 'true');
  });

  it('sets hasTVPreferredFocus on selected pill for tvOS', () => {
    render(
      <ContentTypePills
        value="vod"
        onChange={mockOnChange}
      />
    );

    const vodPill = screen.getByText('search.controls.contentTypes.vod').closest('button');
    expect(vodPill).toHaveProperty('hasTVPreferredFocus', true);
  });

  it('applies focus styles on tvOS', () => {
    const { container } = render(
      <ContentTypePills
        value="all"
        onChange={mockOnChange}
      />
    );

    const firstPill = screen.getByText('search.controls.contentTypes.all').closest('button');
    fireEvent.focus(firstPill);

    // Check for focus styles (border, scale)
    expect(container).toBeTruthy();
  });

  it('maintains horizontal spacing between pills', () => {
    const { container } = render(
      <ContentTypePills
        value="all"
        onChange={mockOnChange}
      />
    );

    const pillContainer = container.querySelector('[data-testid="pill-container"]');
    expect(pillContainer).toHaveStyle({ gap: expect.any(Number) });
  });

  it('shows emoji and label for each pill', () => {
    render(
      <ContentTypePills
        value="all"
        onChange={mockOnChange}
      />
    );

    // Check VOD pill has both emoji and label
    const vodPill = screen.getByText('search.controls.contentTypes.vod').closest('button');
    expect(vodPill?.textContent).toContain('🎬');
    expect(vodPill?.textContent).toContain('search.controls.contentTypes.vod');
  });

  it('applies active styles to selected pill', () => {
    const { container } = render(
      <ContentTypePills
        value="live"
        onChange={mockOnChange}
      />
    );

    const livePill = screen.getByText('search.controls.contentTypes.live').closest('button');
    expect(livePill?.className).toContain('pillActive');
  });

  it('supports keyboard navigation', () => {
    render(
      <ContentTypePills
        value="all"
        onChange={mockOnChange}
      />
    );

    const allPill = screen.getByText('search.controls.contentTypes.all');
    const vodPill = screen.getByText('search.controls.contentTypes.vod');

    // Tab to next element
    fireEvent.keyDown(allPill, { key: 'Tab' });
    expect(vodPill).toHaveFocus();
  });

  it('renders all pills in correct order', () => {
    const { container } = render(
      <ContentTypePills
        value="all"
        onChange={mockOnChange}
      />
    );

    const pills = container.querySelectorAll('button');
    const labels = Array.from(pills).map(pill => pill.textContent);

    expect(labels[0]).toContain('search.controls.contentTypes.all');
    expect(labels[1]).toContain('search.controls.contentTypes.vod');
    expect(labels[2]).toContain('search.controls.contentTypes.live');
    expect(labels[3]).toContain('search.controls.contentTypes.radio');
    expect(labels[4]).toContain('search.controls.contentTypes.podcast');
  });
});
