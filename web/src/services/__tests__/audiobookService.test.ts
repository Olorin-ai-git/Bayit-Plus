/**
 * Audiobook API Service Tests
 */

import audiobookService from '../audiobookService'
import * as api from '../api'
import type {
  Audiobook,
  AudiobookListResponse,
  AudiobookFilters,
} from '../../types/audiobook'

jest.mock('../api')

describe('audiobookService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getAudiobooks', () => {
    it('should fetch audiobooks without filters', async () => {
      const mockResponse: AudiobookListResponse = {
        items: [
          {
            id: '1',
            title: 'Test Audiobook',
            author: 'Test Author',
            view_count: 100,
            avg_rating: 4.5,
            is_featured: true,
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

      ;(api.get as jest.Mock).mockResolvedValue(mockResponse)

      const result = await audiobookService.getAudiobooks()

      expect(result).toEqual(mockResponse)
      expect(api.get).toHaveBeenCalledWith('/audiobooks?')
    })

    it('should fetch audiobooks with filters', async () => {
      const filters: AudiobookFilters = {
        page: 2,
        page_size: 25,
        author: 'John',
        sort_by: 'title',
      }

      const mockResponse: AudiobookListResponse = {
        items: [],
        total: 0,
        page: 2,
        page_size: 25,
        total_pages: 0,
      }

      ;(api.get as jest.Mock).mockResolvedValue(mockResponse)

      const result = await audiobookService.getAudiobooks(filters)

      expect(result).toEqual(mockResponse)
      expect(api.get).toHaveBeenCalled()
    })

    it('should cache results for 2 minutes', async () => {
      const mockResponse: AudiobookListResponse = {
        items: [],
        total: 0,
        page: 1,
        page_size: 50,
        total_pages: 0,
      }

      ;(api.get as jest.Mock).mockResolvedValue(mockResponse)

      const result1 = await audiobookService.getAudiobooks()
      const result2 = await audiobookService.getAudiobooks()

      expect(result1).toEqual(mockResponse)
      expect(result2).toEqual(mockResponse)
      expect(api.get).toHaveBeenCalledTimes(1) // Cache hit on second call
    })
  })

  describe('getAudiobookDetail', () => {
    it('should fetch single audiobook by ID', async () => {
      const mockAudiobook: Audiobook = {
        id: '1',
        title: 'Test Book',
        author: 'Test Author',
        narrator: 'Test Narrator',
        description: 'Test Description',
        duration: '08:30:00',
        year: 2020,
        rating: 4.5,
        thumbnail: 'https://example.com/thumb.jpg',
        audio_quality: '24-bit',
        view_count: 1000,
        avg_rating: 4.2,
        is_featured: false,
        requires_subscription: 'basic',
        content_format: 'audiobook',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }

      ;(api.get as jest.Mock).mockResolvedValue(mockAudiobook)

      const result = await audiobookService.getAudiobookDetail('1')

      expect(result).toEqual(mockAudiobook)
      expect(api.get).toHaveBeenCalledWith('/audiobooks/1')
    })
  })

  describe('getAudiobookStream', () => {
    it('should fetch stream URL for admin', async () => {
      const mockStream = {
        id: '1',
        title: 'Test Book',
        author: 'Test Author',
        stream_url: 'https://example.com/stream.m3u8',
        stream_type: 'hls' as const,
        is_drm_protected: false,
      }

      ;(api.get as jest.Mock).mockResolvedValue(mockStream)

      const result = await audiobookService.getAudiobookStream('1')

      expect(result).toEqual(mockStream)
      expect(api.get).toHaveBeenCalledWith('/audiobooks/1/stream')
    })

    it('should handle 403 Forbidden for non-admin', async () => {
      ;(api.get as jest.Mock).mockRejectedValue({
        response: { status: 403, data: { detail: 'Forbidden' } },
      })

      await expect(audiobookService.getAudiobookStream('1')).rejects.toThrow()
    })
  })

  describe('getFeaturedAudiobooks', () => {
    it('should fetch featured audiobooks with default limit', async () => {
      const mockFeatured: Audiobook[] = [
        {
          id: '1',
          title: 'Featured Book 1',
          author: 'Author 1',
          view_count: 5000,
          avg_rating: 4.8,
          is_featured: true,
          requires_subscription: 'free',
          content_format: 'audiobook',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      ]

      ;(api.get as jest.Mock).mockResolvedValue({
        items: mockFeatured,
        total: 1,
        page: 1,
        page_size: 10,
        total_pages: 1,
      })

      const result = await audiobookService.getFeaturedAudiobooks()

      expect(result).toEqual(mockFeatured)
    })

    it('should cache featured results for 5 minutes', async () => {
      const mockFeatured: Audiobook[] = []

      ;(api.get as jest.Mock).mockResolvedValue({
        items: mockFeatured,
        total: 0,
        page: 1,
        page_size: 10,
        total_pages: 0,
      })

      const result1 = await audiobookService.getFeaturedAudiobooks()
      const result2 = await audiobookService.getFeaturedAudiobooks()

      expect(result1).toEqual(mockFeatured)
      expect(result2).toEqual(mockFeatured)
      expect(api.get).toHaveBeenCalledTimes(1)
    })
  })

  describe('searchAudiobooks', () => {
    it('should search audiobooks by query', async () => {
      const mockResults = {
        results: [
          {
            id: '1',
            title: 'Search Result',
            author: 'Test Author',
            thumbnail: 'https://example.com/thumb.jpg',
            type: 'audiobook' as const,
          },
        ],
        total: 1,
        query: 'test',
      }

      ;(api.get as jest.Mock).mockResolvedValue(mockResults)

      const result = await audiobookService.searchAudiobooks('test')

      expect(result).toEqual(mockResults)
      expect(api.get).toHaveBeenCalled()
    })

    it('should return empty results for short query', async () => {
      const result = await audiobookService.searchAudiobooks('a')

      expect(result).toEqual({ results: [], total: 0, query: 'a' })
      expect(api.get).not.toHaveBeenCalled()
    })
  })

  describe('getSearchSuggestions', () => {
    it('should fetch search suggestions', async () => {
      const mockSuggestions = {
        suggestions: [
          {
            id: '1',
            title: 'Suggestion 1',
            type: 'title' as const,
          },
        ],
      }

      ;(api.get as jest.Mock).mockResolvedValue(mockSuggestions)

      const result = await audiobookService.getSearchSuggestions('test')

      expect(result).toEqual(mockSuggestions.suggestions)
    })
  })

  describe('getFeaturedBySection', () => {
    it('should fetch featured audiobooks by section', async () => {
      const mockSections = [
        {
          section_id: '1',
          section_name: 'Recommended',
          audiobooks: [],
          order: 1,
        },
      ]

      ;(api.get as jest.Mock).mockResolvedValue(mockSections)

      const result = await audiobookService.getFeaturedBySection()

      expect(result).toEqual(mockSections)
    })
  })

  describe('clearCache', () => {
    it('should clear cached audiobook data', async () => {
      const mockResponse: AudiobookListResponse = {
        items: [],
        total: 0,
        page: 1,
        page_size: 50,
        total_pages: 0,
      }

      ;(api.get as jest.Mock).mockResolvedValue(mockResponse)

      await audiobookService.getAudiobooks()
      expect(api.get).toHaveBeenCalledTimes(1)

      audiobookService.clearCache()

      await audiobookService.getAudiobooks()
      expect(api.get).toHaveBeenCalledTimes(2) // Cache was cleared
    })
  })
})
