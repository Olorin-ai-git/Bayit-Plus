/**
 * Admin Audiobook API Service
 * Client-side service for admin audiobook management endpoints
 */

import api from './api'
import type {
  AudiobookAdmin,
  AudiobookCreateRequest,
  AudiobookUpdateRequest,
  AudiobookAdminListResponse,
  AudiobookFeatureResponse,
  AudiobookBulkOperationRequest,
  AudiobookBulkOperationResponse,
  AudiobookAdminFilters,
} from '../types/audiobook'

export interface FileUploadProgress {
  loaded: number
  total: number
  percent: number
}

export interface UploadResponse {
  stream_url: string
  duration: number
  format: string
  size_bytes: number
}

export const adminAudiobookService = {
  /**
   * Get paginated list of audiobooks (admin view with sensitive fields)
   */
  getAudiobooksList: async (filters?: AudiobookAdminFilters): Promise<AudiobookAdminListResponse> => {
    const queryParams = new URLSearchParams()
    if (filters) {
      if (filters.page) queryParams.append('page', filters.page.toString())
      if (filters.page_size) queryParams.append('page_size', filters.page_size.toString())
      if (filters.author) queryParams.append('author', filters.author)
      if (filters.narrator) queryParams.append('narrator', filters.narrator)
      if (filters.audio_quality) queryParams.append('audio_quality', filters.audio_quality)
      if (filters.requires_subscription) queryParams.append('requires_subscription', filters.requires_subscription)
      if (filters.is_published !== undefined) queryParams.append('is_published', filters.is_published.toString())
      if (filters.is_featured !== undefined) queryParams.append('is_featured', filters.is_featured.toString())
      if (filters.visibility_mode) queryParams.append('visibility_mode', filters.visibility_mode)
      if (filters.search_query) queryParams.append('search_query', filters.search_query)
      if (filters.min_rating !== undefined) queryParams.append('min_rating', filters.min_rating.toString())
      if (filters.max_rating !== undefined) queryParams.append('max_rating', filters.max_rating.toString())
      if (filters.created_after) queryParams.append('created_after', filters.created_after)
      if (filters.created_before) queryParams.append('created_before', filters.created_before)
      if (filters.sort_by) queryParams.append('sort_by', filters.sort_by)
      if (filters.sort_order) queryParams.append('sort_order', filters.sort_order)
    }

    return await api.get<AudiobookAdminListResponse>(`/admin/audiobooks?${queryParams.toString()}`)
  },

  /**
   * Create new audiobook
   * Returns HTTP 201 Created on success
   */
  createAudiobook: async (data: AudiobookCreateRequest): Promise<AudiobookAdmin> => {
    return await api.post<AudiobookAdmin>('/admin/audiobooks', data)
  },

  /**
   * Update audiobook by ID
   * All fields are optional (PATCH semantics)
   */
  updateAudiobook: async (id: string, data: AudiobookUpdateRequest): Promise<AudiobookAdmin> => {
    return await api.patch<AudiobookAdmin>(`/admin/audiobooks/${id}`, data)
  },

  /**
   * Delete audiobook by ID
   * Returns HTTP 200 OK on success
   */
  deleteAudiobook: async (id: string): Promise<{ message: string }> => {
    return await api.delete<{ message: string }>(`/admin/audiobooks/${id}`)
  },

  /**
   * Publish audiobook (makes it visible to users)
   * Sets is_published=true and can optionally update visibility
   */
  publishAudiobook: async (
    id: string,
    options?: { visibility_mode?: 'public' | 'private' | 'restricted' }
  ): Promise<AudiobookAdmin> => {
    return await api.post<AudiobookAdmin>(`/admin/audiobooks/${id}/publish`, options || {})
  },

  /**
   * Unpublish audiobook (hides from users)
   * Sets is_published=false, keeps metadata intact
   */
  unpublishAudiobook: async (id: string): Promise<AudiobookAdmin> => {
    return await api.post<AudiobookAdmin>(`/admin/audiobooks/${id}/unpublish`, {})
  },

  /**
   * Feature audiobook in a section
   * Adds audiobook to featured carousel in specified section
   */
  featureAudiobook: async (
    id: string,
    sectionId: string,
    order: number
  ): Promise<AudiobookFeatureResponse> => {
    return await api.post<AudiobookFeatureResponse>(`/admin/audiobooks/${id}/feature`, {
      section_id: sectionId,
      order,
    })
  },

  /**
   * Unfeature audiobook from section
   * Removes audiobook from featured carousel
   */
  unfeatureAudiobook: async (id: string, sectionId?: string): Promise<AudiobookFeatureResponse> => {
    const body = sectionId ? { section_id: sectionId } : {}
    return await api.post<AudiobookFeatureResponse>(`/admin/audiobooks/${id}/unfeature`, body)
  },

  /**
   * Upload audio file to GCS
   * Returns stream URL and metadata
   * Tracks upload progress via onProgress callback
   */
  uploadAudioFile: async (
    file: File,
    onProgress?: (progress: FileUploadProgress) => void
  ): Promise<UploadResponse> => {
    const formData = new FormData()
    formData.append('file', file)

    return await api.post<UploadResponse>('/admin/audiobooks/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          onProgress({
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percent: Math.round((progressEvent.loaded / progressEvent.total) * 100),
          })
        }
      },
    })
  },

  /**
   * Perform bulk operations on multiple audiobooks
   * Supports: publish, unpublish, delete, feature, unfeature
   */
  bulkOperation: async (request: AudiobookBulkOperationRequest): Promise<AudiobookBulkOperationResponse> => {
    return await api.post<AudiobookBulkOperationResponse>('/admin/audiobooks/bulk', request)
  },

  /**
   * Bulk publish audiobooks
   */
  bulkPublish: async (audiobookIds: string[]): Promise<AudiobookBulkOperationResponse> => {
    return await api.post<AudiobookBulkOperationResponse>('/admin/audiobooks/bulk', {
      audiobook_ids: audiobookIds,
      operation: 'publish',
    })
  },

  /**
   * Bulk delete audiobooks
   */
  bulkDelete: async (audiobookIds: string[]): Promise<AudiobookBulkOperationResponse> => {
    return await api.post<AudiobookBulkOperationResponse>('/admin/audiobooks/bulk', {
      audiobook_ids: audiobookIds,
      operation: 'delete',
    })
  },

  /**
   * Reindex audiobook in search service
   * Useful after metadata updates
   */
  reindexAudiobook: async (id: string): Promise<{ message: string }> => {
    return await api.post<{ message: string }>(`/admin/audiobooks/${id}/reindex`, {})
  },
}

export default adminAudiobookService
