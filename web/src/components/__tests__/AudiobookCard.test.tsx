/**
 * AudiobookCard Tests
 */

import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import AudiobookCard from '../AudiobookCard'
import type { Audiobook } from '@/types/audiobook'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

describe('AudiobookCard', () => {
  const mockAudiobook: Audiobook = {
    id: '1',
    title: 'Test Audiobook',
    author: 'Test Author',
    narrator: 'Test Narrator',
    description: 'Test Description',
    duration: '08:30:00',
    thumbnail: 'https://example.com/thumb.jpg',
    view_count: 1000,
    avg_rating: 4.5,
    is_featured: true,
    requires_subscription: 'free',
    content_format: 'audiobook',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }

  it('should render audiobook card with data', () => {
    render(
      <BrowserRouter>
        <AudiobookCard audiobook={mockAudiobook} />
      </BrowserRouter>
    )

    expect(screen.getByText('Test Audiobook')).toBeInTheDocument()
    expect(screen.getByText('Test Author')).toBeInTheDocument()
  })

  it('should display rating when available', () => {
    render(
      <BrowserRouter>
        <AudiobookCard audiobook={mockAudiobook} />
      </BrowserRouter>
    )

    expect(screen.getByText(/⭐ 4.5/)).toBeInTheDocument()
  })

  it('should format large view counts', () => {
    const bookWith1kViews = { ...mockAudiobook, view_count: 1000 }
    render(
      <BrowserRouter>
        <AudiobookCard audiobook={bookWith1kViews} />
      </BrowserRouter>
    )

    expect(screen.getByText(/1K/)).toBeInTheDocument()
  })

  it('should link to detail page on click', () => {
    render(
      <BrowserRouter>
        <AudiobookCard audiobook={mockAudiobook} />
      </BrowserRouter>
    )

    const link = screen.getByText('Test Audiobook').closest('a')
    expect(link).toHaveAttribute('href', '/audiobooks/1')
  })

  it('should render placeholder when no thumbnail', () => {
    const bookNoThumbnail = { ...mockAudiobook, thumbnail: undefined }
    render(
      <BrowserRouter>
        <AudiobookCard audiobook={bookNoThumbnail} />
      </BrowserRouter>
    )

    expect(screen.getByText('🎧')).toBeInTheDocument()
  })

  it('should not display rating when zero', () => {
    const bookNoRating = { ...mockAudiobook, avg_rating: 0 }
    render(
      <BrowserRouter>
        <AudiobookCard audiobook={bookNoRating} />
      </BrowserRouter>
    )

    expect(screen.queryByText(/⭐/)).not.toBeInTheDocument()
  })
})
