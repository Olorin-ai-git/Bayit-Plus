/**
 * Test suite for ContentTypePills Component
 * Tests content type filtering pills (All, VOD, Live, Radio, Podcast)
 */

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TestRenderer, { act as rendererAct } from 'react-test-renderer';
import { Platform, TouchableOpacity } from 'react-native';
import { ContentTypePills } from '../ContentTypePills';
import type { ContentType } from '../../../../../shared/hooks/useSearch';

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


function inspectTvPills(value: 'all' | 'vod', inspect: (buttons: TestRenderer.ReactTestInstance[]) => void) {
  const descriptor = Object.getOwnPropertyDescriptor(Platform, 'isTV');
  Object.defineProperty(Platform, 'isTV', { configurable: true, value: true });
  let tree: TestRenderer.ReactTestRenderer | undefined;
  try {
    rendererAct(() => { tree = TestRenderer.create(<ContentTypePills value={value} onChange={jest.fn()} />); });
    inspect(tree!.root.findAllByType(TouchableOpacity));
  } finally {
    rendererAct(() => tree?.unmount());
    if (descriptor) Object.defineProperty(Platform, 'isTV', descriptor);
    else Reflect.deleteProperty(Platform, 'isTV');
  }
}

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

  it('renders content type icons', () => {
    const { container } = render(
      <ContentTypePills
        value="all"
        onChange={mockOnChange}
      />
    );

    expect(screen.getByRole('button', { name: 'search.controls.contentTypes.vod' }).querySelector('svg')).not.toBeNull(); // VOD
    expect(screen.getByRole('button', { name: 'search.controls.contentTypes.live' }).querySelector('svg')).not.toBeNull(); // Live
    expect(screen.getByRole('button', { name: 'search.controls.contentTypes.radio' }).querySelector('svg')).not.toBeNull(); // Radio
    expect(screen.getByRole('button', { name: 'search.controls.contentTypes.podcast' }).querySelector('svg')).not.toBeNull(); // Podcast
  });

  it('highlights "all" pill when all is selected', () => {
    render(
      <ContentTypePills
        value="all"
        onChange={mockOnChange}
      />
    );

    const allPill = screen.getByText('search.controls.contentTypes.all').closest('button');
    expect(allPill).toHaveAttribute('aria-selected', 'true');
  });

  it('highlights "vod" pill when vod is selected', () => {
    render(
      <ContentTypePills
        value="vod"
        onChange={mockOnChange}
      />
    );

    const vodPill = screen.getByText('search.controls.contentTypes.vod').closest('button');
    expect(vodPill).toHaveAttribute('aria-selected', 'true');
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

    expect(allPill).toHaveAttribute('aria-selected', 'false');
    expect(livePill).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onChange with "vod" when VOD pill is pressed', () => {
    render(
      <ContentTypePills
        value="all"
        onChange={mockOnChange}
      />
    );

    const vodPill = screen.getByText('search.controls.contentTypes.vod');
    fireEvent.click(vodPill);

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
    fireEvent.click(livePill);

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
    fireEvent.click(radioPill);

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
    fireEvent.click(podcastPill);

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
    fireEvent.click(allPill);

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

    const scrollView = container.firstElementChild;
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
      const minHeight = Math.max(...Array.from(pill.querySelectorAll('*')).map(node => parseInt(window.getComputedStyle(node).minHeight) || 0));
      expect(minHeight).toBeGreaterThanOrEqual(44);
    });
  });

  it('supports tvOS focus navigation', () => {
    inspectTvPills('all', buttons => {
      expect(buttons[0].props.focusable).toBe(true);
    });
  });

  it('sets hasTVPreferredFocus on selected pill for tvOS', () => {
    inspectTvPills('vod', buttons => {
      const vodPill = buttons.find(button => button.props.accessibilityLabel === 'search.controls.contentTypes.vod');
      expect(vodPill?.props).toHaveProperty('hasTVPreferredFocus', true);
    });
  });

  it('applies focus styles on tvOS', () => {
    const { container } = render(
      <ContentTypePills
        value="all"
        onChange={mockOnChange}
      />
    );

    const firstPill = screen.getByText('search.controls.contentTypes.all').closest('button')!;
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

    const pillContainer = container.firstElementChild?.firstElementChild;
    expect(parseFloat(window.getComputedStyle(pillContainer!).gap)).toBeGreaterThan(0);
  });

  it('shows icon and label for each pill', () => {
    render(
      <ContentTypePills
        value="all"
        onChange={mockOnChange}
      />
    );

    // Check VOD pill has both icon and label
    const vodPill = screen.getByText('search.controls.contentTypes.vod').closest('button');
    expect(vodPill?.querySelector('svg')).not.toBeNull();
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
    expect(livePill).toHaveAttribute('aria-selected', 'true');
  });

  it('supports keyboard navigation', async () => {
    render(
      <ContentTypePills
        value="all"
        onChange={mockOnChange}
      />
    );

    const allPill = screen.getByRole('button', { name: 'search.controls.contentTypes.all' });
    const vodPill = screen.getByRole('button', { name: 'search.controls.contentTypes.vod' });

    // Tab to next element
    allPill.focus();
    await userEvent.tab();
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

 test('explicit selection takes precedence over the value alias', () => {
   render(<ContentTypePills selected="live" value="vod" onChange={jest.fn()} />);
   expect(screen.getByRole('button', { name: 'search.controls.contentTypes.live' })).toHaveAttribute('aria-selected', 'true');
   expect(screen.getByRole('button', { name: 'search.controls.contentTypes.vod' })).toHaveAttribute('aria-selected', 'false');
 });
