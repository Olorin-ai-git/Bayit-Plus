/**
 * Admin Audiobook API Service Tests
 */

import adminAudiobookService from '../adminAudiobookService'
import * as api from '../api'
import type {
  AudiobookAdmin,
  AudiobookCreateRequest,
  AudiobookUpdateRequest,
} from '../../types/audiobook'

jest.mock('../api')

describe('adminAudiobookService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getAudiobooksList', () => {
    it('should fetch audiobooks list for admin', async () => {
      const mockResponse = {
        items: [
          {
            id: '1',
            title: 'Admin View Book',
            author: 'Test Author',
            stream_url: 'https://example.com/stream.m3u8',
            stream_type: 'hls' as const,
            is_drm_protected: false,
            is_published: true,
            visibility_mode: 'public' as const,
            section_ids: [],
            genre_ids: [],
            topic_tags: [],
            view_count: 1000,
            avg_rating: 4.5,
            is_featured: false,
            requires_subscription: 'free' as const,
            content_format: 'audiobook' as const,
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

      const result = await adminAudiobookService.getAudiobooksList()

      expect(result).toEqual(mockResponse)
      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/admin/audiobooks'))
    })

    it('should support admin-specific filters', async () => {
      ;(api.get as jest.Mock).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        page_size: 50,
        total_pages: 0,
      })

      await adminAudiobookService.getAudiobooksList({
        is_featured: true,
        visibility_mode: 'private',
        min_rating: 4.0,
      })

      expect(api.get).toHaveBeenCalled()
      const callUrl = (api.get as jest.Mock).mock.calls[0][0]
      expect(callUrl).toContain('is_featured=true')
      expect(callUrl).toContain('visibility_mode=private')
      expect(callUrl).toContain('min_rating=4')
    })
  })

  describe('createAudiobook', () => {
    it('should create new audiobook with valid request', async () => {
      const createRequest: AudiobookCreateRequest = {
        title: 'New Audiobook',
        author: 'New Author',
        stream_url: 'https://example.com/audio.mp3',
        is_published: false,
      }

      const mockAudiobook: AudiobookAdmin = {
        id: 'new-id',
        ...createRequest,
        stream_type: 'hls',
        is_drm_protected: false,
        is_published: false,
        visibility_mode: 'public',
        section_ids: [],
        genre_ids: [],
        topic_tags: [],
        view_count: 0,
        avg_rating: 0,
        is_featured: false,
        requires_subscription: 'free',
        content_format: 'audiobook',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }

      ;(api.post as jest.Mock).mockResolvedValue(mockAudiobook)

      const result = await adminAudiobookService.createAudiobook(createRequest)

      expect(result).toEqual(mockAudiobook)
      expect(api.post).toHaveBeenCalledWith('/admin/audiobooks', createRequest)
    })
  })

  describe('updateAudiobook', () => {
    it('should update audiobook with partial data', async () => {
      const updateRequest: AudiobookUpdateRequest = {
        title: 'Updated Title',
        is_published: true,
      }

      const mockUpdated: AudiobookAdmin = {
        id: '1',
        title: 'Updated Title',
        author: 'Test Author',
        stream_url: 'https://example.com/stream.m3u8',
        stream_type: 'hls',
        is_drm_protected: false,
        is_published: true,
        visibility_mode: 'public',
        section_ids: [],
        genre_ids: [],
        topic_tags: [],
        view_count: 1000,
        avg_rating: 4.5,
        is_featured: false,
        requires_subscription: 'free',
        content_format: 'audiobook',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }

      ;(api.patch as jest.Mock).mockResolvedValue(mockUpdated)

      const result = await adminAudiobookService.updateAudiobook('1', updateRequest)

      expect(result).toEqual(mockUpdated)
      expect(api.patch).toHaveBeenCalledWith('/admin/audiobooks/1', updateRequest)
    })
  })

  describe('deleteAudiobook', () => {
    it('should delete audiobook by ID', async () => {
      const mockResponse = { message: 'Audiobook deleted successfully' }

      ;(api.delete as jest.Mock).mockResolvedValue(mockResponse)

      const result = await adminAudiobookService.deleteAudiobook('1')

      expect(result).toEqual(mockResponse)
      expect(api.delete).toHaveBeenCalledWith('/admin/audiobooks/1')
    })
  })

  describe('publishAudiobook', () => {
    it('should publish audiobook', async () => {
      const mockPublished: AudiobookAdmin = {
        id: '1',
        title: 'Published Book',
        author: 'Test Author',
        stream_url: 'https://example.com/stream.m3u8',
        stream_type: 'hls',
        is_drm_protected: false,
        is_published: true,
        visibility_mode: 'public',
        section_ids: [],
        genre_ids: [],
        topic_tags: [],
        view_count: 0,
        avg_rating: 0,
        is_featured: false,
        requires_subscription: 'free',
        content_format: 'audiobook',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }

      ;(api.post as jest.Mock).mockResolvedValue(mockPublished)

      const result = await adminAudiobookService.publishAudiobook('1')

      expect(result).toEqual(mockPublished)
      expect(api.post).toHaveBeenCalledWith('/admin/audiobooks/1/publish', {})
    })

    it('should publish with visibility mode', async () => {
      const mockPublished: AudiobookAdmin = {
        id: '1',
        title: 'Private Book',
        author: 'Test Author',
        stream_url: 'https://example.com/stream.m3u8',
        stream_type: 'hls',
        is_drm_protected: false,
        is_published: true,
        visibility_mode: 'private',
        section_ids: [],
        genre_ids: [],
        topic_tags: [],
        view_count: 0,
        avg_rating: 0,
        is_featured: false,
        requires_subscription: 'free',
        content_format: 'audiobook',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }

      ;(api.post as jest.Mock).mockResolvedValue(mockPublished)

      const result = await adminAudiobookService.publishAudiobook('1', {
        visibility_mode: 'private',
      })

      expect(result).toEqual(mockPublished)
      expect(api.post).toHaveBeenCalledWith('/admin/audiobooks/1/publish', {
        visibility_mode: 'private',
      })
    })
  })

  describe('unpublishAudiobook', () => {
    it('should unpublish audiobook', async () => {
      const mockUnpublished: AudiobookAdmin = {
        id: '1',
        title: 'Unpublished Book',
        author: 'Test Author',
        stream_url: 'https://example.com/stream.m3u8',
        stream_type: 'hls',
        is_drm_protected: false,
        is_published: false,
        visibility_mode: 'public',
        section_ids: [],
        genre_ids: [],
        topic_tags: [],
        view_count: 0,
        avg_rating: 0,
        is_featured: false,
        requires_subscription: 'free',
        content_format: 'audiobook',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }

      ;(api.post as jest.Mock).mockResolvedValue(mockUnpublished)

      const result = await adminAudiobookService.unpublishAudiobook('1')

      expect(result).toEqual(mockUnpublished)
      expect(api.post).toHaveBeenCalledWith('/admin/audiobooks/1/unpublish', {})
    })
  })

  describe('featureAudiobook', () => {
    it('should feature audiobook in section', async () => {
      const mockResponse = {
        message: 'Audiobook featured successfully',
        audiobook_id: '1',
        is_featured: true,
      }

      ;(api.post as jest.Mock).mockResolvedValue(mockResponse)

      const result = await adminAudiobookService.featureAudiobook('1', 'recommended', 1)

      expect(result).toEqual(mockResponse)
      expect(api.post).toHaveBeenCalledWith('/admin/audiobooks/1/feature', {
        section_id: 'recommended',
        order: 1,
      })
    })
  })

  describe('unfeatureAudiobook', () => {
    it('should unfeature audiobook', async () => {
      const mockResponse = {
        message: 'Audiobook unfeatured successfully',
        audiobook_id: '1',
        is_featured: false,
      }

      ;(api.post as jest.Mock).mockResolvedValue(mockResponse)

      const result = await adminAudiobookService.unfeatureAudiobook('1')

      expect(result).toEqual(mockResponse)
      expect(api.post).toHaveBeenCalledWith('/admin/audiobooks/1/unfeature', {})
    })
  })

  describe('uploadAudioFile', () => {
    it('should upload audio file with progress tracking', async () => {
      const mockFile = new File(['audio content'], 'test.mp3', { type: 'audio/mpeg' })

      const mockResponse = {
        stream_url: 'https://example.com/stream.m3u8',
        duration: 3600,
        format: 'hls',
        size_bytes: 1024000,
      }

      ;(api.post as jest.Mock).mockResolvedValue(mockResponse)

      const progressTracker: number[] = []
      const onProgress = jest.fn((progress) => {
        progressTracker.push(progress.percent)
      })

      const result = await adminAudiobookService.uploadAudioFile(mockFile, onProgress)

      expect(result).toEqual(mockResponse)
      expect(api.post).toHaveBeenCalled()
    })
  })

  describe('bulkOperation', () => {
    it('should perform bulk operations', async () => {
      const mockResponse = {
        success: 3,
        failed: 0,
        total: 3,
      }

      ;(api.post as jest.Mock).mockResolvedValue(mockResponse)

      const result = await adminAudiobookService.bulkOperation({
        audiobook_ids: ['1', '2', '3'],
        operation: 'publish',
      })

      expect(result).toEqual(mockResponse)
      expect(api.post).toHaveBeenCalledWith('/admin/audiobooks/bulk', {
        audiobook_ids: ['1', '2', '3'],
        operation: 'publish',
      })
    })
  })

  describe('bulkPublish', () => {
    it('should bulk publish audiobooks', async () => {
      const mockResponse = { success: 5, failed: 0, total: 5 }

      ;(api.post as jest.Mock).mockResolvedValue(mockResponse)

      const result = await adminAudiobookService.bulkPublish(['1', '2', '3', '4', '5'])

      expect(result).toEqual(mockResponse)
    })
  })

  describe('bulkDelete', () => {
    it('should bulk delete audiobooks', async () => {
      const mockResponse = { success: 2, failed: 0, total: 2 }

      ;(api.post as jest.Mock).mockResolvedValue(mockResponse)

      const result = await adminAudiobookService.bulkDelete(['1', '2'])

      expect(result).toEqual(mockResponse)
    })
  })

  describe('reindexAudiobook', () => {
    it('should reindex audiobook in search', async () => {
      const mockResponse = { message: 'Audiobook reindexed successfully' }

      ;(api.post as jest.Mock).mockResolvedValue(mockResponse)

      const result = await adminAudiobookService.reindexAudiobook('1')

      expect(result).toEqual(mockResponse)
      expect(api.post).toHaveBeenCalledWith('/admin/audiobooks/1/reindex', {})
    })
  })
})
