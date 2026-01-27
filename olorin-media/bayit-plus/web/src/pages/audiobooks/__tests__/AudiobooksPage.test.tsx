/**
 * AudiobooksPage Tests
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import AudiobooksPage from '../AudiobooksPage'
import * as audiobookService from '@/services/audiobookService'

jest.mock('@/services/audiobookService')
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
  }),
}))
jest.mock('@/hooks/useDirection', () => ({
  useDirection: () => ({ isRTL: false }),
}))

describe('AudiobooksPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render loading state initially', () => {
    ;(audiobookService.default.getAudiobooks as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    )

    render(
      <BrowserRouter>
        <AudiobooksPage />
      </BrowserRouter>
    )

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('should load and display audiobooks', async () => {
    const mockAudiobooks = {
      items: [
        {
          id: '1',
          title: 'Test Audiobook',
          author: 'Test Author',
          view_count: 100,
          avg_rating: 4.5,
          is_featured: false,
          requires_subscription: 'free',
          content_format: 'audiobook',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      page_size: 50,
      total_pages: 1,
    }

    ;(audiobookService.default.getAudiobooks as jest.Mock).mockResolvedValue(mockAudiobooks)

    render(
      <BrowserRouter>
        <AudiobooksPage />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Test Audiobook')).toBeInTheDocument()
    })
  })

  it('should filter audiobooks by search query', async () => {
    const mockAudiobooks = {
      items: [
        { id: '1', title: 'Adventure Book', author: 'John', view_count: 0, avg_rating: 0, is_featured: false, requires_subscription: 'free', content_format: 'audiobook', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
      ],
      total: 1,
      page: 1,
      page_size: 50,
      total_pages: 1,
    }

    ;(audiobookService.default.getAudiobooks as jest.Mock).mockResolvedValue(mockAudiobooks)

    render(
      <BrowserRouter>
        <AudiobooksPage />
      </BrowserRouter>
    )

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/search/i) as HTMLInputElement
      fireEvent.change(searchInput, { target: { value: 'Adventure' } })
    })

    await waitFor(() => {
      expect(screen.getByText('Adventure Book')).toBeInTheDocument()
    })
  })

  it('should handle errors gracefully', async () => {
    ;(audiobookService.default.getAudiobooks as jest.Mock).mockRejectedValue(
      new Error('API Error')
    )

    render(
      <BrowserRouter>
        <AudiobooksPage />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/error|failed/i)).toBeInTheDocument()
    })
  })
})
