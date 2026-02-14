/**
 * CollectionPromoBanner Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { CollectionPromoBanner } from '../CollectionPromoBanner';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('CollectionPromoBanner', () => {
  const defaultProps = {
    collectionId: 'test-collection-123',
    title: 'The Lord of the Rings Collection',
    posterUrl: 'https://example.com/poster.jpg',
    promoText: 'An epic journey through Middle-earth spanning three films...',
    movieCount: 3,
  };

  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders collection title', () => {
    render(
      <BrowserRouter>
        <CollectionPromoBanner {...defaultProps} />
      </BrowserRouter>
    );

    expect(screen.getByText('The Lord of the Rings Collection')).toBeInTheDocument();
  });

  it('renders promotional text', () => {
    render(
      <BrowserRouter>
        <CollectionPromoBanner {...defaultProps} />
      </BrowserRouter>
    );

    expect(
      screen.getByText('An epic journey through Middle-earth spanning three films...')
    ).toBeInTheDocument();
  });

  it('renders movie count', () => {
    render(
      <BrowserRouter>
        <CollectionPromoBanner {...defaultProps} />
      </BrowserRouter>
    );

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('vod.collection.movies')).toBeInTheDocument();
  });

  it('renders poster image when posterUrl is provided', () => {
    render(
      <BrowserRouter>
        <CollectionPromoBanner {...defaultProps} />
      </BrowserRouter>
    );

    const image = screen.getByAlt('The Lord of the Rings Collection');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://example.com/poster.jpg');
  });

  it('does not render poster when posterUrl is undefined', () => {
    render(
      <BrowserRouter>
        <CollectionPromoBanner {...defaultProps} posterUrl={undefined} />
      </BrowserRouter>
    );

    const image = screen.queryByAlt('The Lord of the Rings Collection');
    expect(image).not.toBeInTheDocument();
  });

  it('navigates to collection detail on Watch Now click', () => {
    render(
      <BrowserRouter>
        <CollectionPromoBanner {...defaultProps} />
      </BrowserRouter>
    );

    const watchNowButton = screen.getByText('vod.collection.watchNow');
    fireEvent.click(watchNowButton);

    expect(mockNavigate).toHaveBeenCalledWith('/vod/collection/test-collection-123');
  });

  it('renders AI recommendation badge', () => {
    render(
      <BrowserRouter>
        <CollectionPromoBanner {...defaultProps} />
      </BrowserRouter>
    );

    expect(screen.getByText('vod.collection.aiRecommendation')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <BrowserRouter>
        <CollectionPromoBanner {...defaultProps} className="custom-class" />
      </BrowserRouter>
    );

    const banner = container.querySelector('.collection-promo-banner');
    expect(banner).toHaveClass('custom-class');
  });

  it('fades in on mount', async () => {
    const { container } = render(
      <BrowserRouter>
        <CollectionPromoBanner {...defaultProps} />
      </BrowserRouter>
    );

    const banner = container.querySelector('.collection-promo-banner');
    expect(banner).toHaveClass('opacity-0');

    // Wait for fade-in animation
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(banner).toHaveClass('fade-in');
  });
});
