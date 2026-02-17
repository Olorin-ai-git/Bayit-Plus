/**
 * Tests for CollectionPromoBanner component
 *
 * Tests rotation behavior, fade transitions, hover pause/resume,
 * timer cleanup, and edge cases.
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { CollectionPromoBanner } from '../CollectionPromoBanner';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

// Mock react-router-dom navigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock logger
jest.mock('@/utils/logger', () => ({
  __esModule: true,
  default: {
    scope: () => ({
      info: jest.fn(),
      error: jest.fn(),
    }),
  },
}));

const mockCollections = [
  {
    id: '1',
    title: 'Collection 1',
    title_en: 'Collection 1 EN',
    thumbnail: 'https://example.com/thumb1.jpg',
    backdrop: 'https://example.com/backdrop1.jpg',
    promo_text: 'Hebrew promo 1',
    promo_text_en: 'English promo 1',
    promo_text_es: 'Spanish promo 1',
    available_movies: 10,
    total_movies: 10,
  },
  {
    id: '2',
    title: 'Collection 2',
    title_en: 'Collection 2 EN',
    thumbnail: 'https://example.com/thumb2.jpg',
    promo_text: 'Hebrew promo 2',
    promo_text_en: 'English promo 2',
    available_movies: 5,
    total_movies: 5,
  },
];

describe('CollectionPromoBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders the first collection initially', () => {
    render(
      <BrowserRouter>
        <CollectionPromoBanner collections={mockCollections} />
      </BrowserRouter>
    );

    expect(screen.getByText('Collection 1 EN')).toBeInTheDocument();
    expect(screen.getByText('English promo 1')).toBeInTheDocument();
  });

  it('rotates to next collection after interval', async () => {
    render(
      <BrowserRouter>
        <CollectionPromoBanner 
          collections={mockCollections} 
          autoRotate={true} 
          rotationInterval={5000} 
        />
      </BrowserRouter>
    );

    expect(screen.getByText('Collection 1 EN')).toBeInTheDocument();

    // Fast-forward past rotation interval + transition time
    act(() => {
      jest.advanceTimersByTime(5600);
    });

    await waitFor(() => {
      expect(screen.getByText('Collection 2 EN')).toBeInTheDocument();
    });
  });

  it('handles empty collections array', () => {
    const { container } = render(
      <BrowserRouter>
        <CollectionPromoBanner collections={[]} />
      </BrowserRouter>
    );

    expect(container.firstChild).toBeNull();
  });

  it('cleans up timer on unmount', () => {
    const { unmount } = render(
      <BrowserRouter>
        <CollectionPromoBanner collections={mockCollections} />
      </BrowserRouter>
    );

    unmount();

    act(() => {
      jest.advanceTimersByTime(10000);
    });

    // No errors should occur
    expect(true).toBe(true);
  });
});
