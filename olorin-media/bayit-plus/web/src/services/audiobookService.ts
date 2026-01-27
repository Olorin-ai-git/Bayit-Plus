/**
 * Audiobook API Service
 * Client-side service for public audiobook endpoints
 */

import api from './api'
import type {
  Audiobook,
  AudiobookListResponse,
  AudiobookStreamResponse,
  AudiobookFilters,
  AudiobookSearchSuggestion,
  AudiobookSearchResponse,
  AudiobookFeaturedSection,
} from '../types/audiobook'

const CACHE_TTL_FEATURED = 5 * 60 * 1000 // 5 minutes
const CACHE_TTL_LIST = 2 * 60 * 1000 // 2 minutes

interface CacheEntry<T> {
  data: T
  timestamp: number
}

const cache = new Map<string, CacheEntry<unknown>>()

const setCacheEntry = <T,>(key: string, data: T, ttlMs: number): void => {
  cache.set(key, { data, timestamp: Date.now() + ttlMs })
}

const getCacheEntry = <T,>(key: string): T | null => {
  const entry = cache.get(key) as CacheEntry<T> | undefined
  if (!entry) return null
  if (Date.now() > entry.timestamp) {
    cache.delete(key)
    return null
  }
  return entry.data
}

export const audiobookService = {
  /**
   * Get paginated list of audiobooks with optional filters
   * Cached for 2 minutes
   */
  getAudiobooks: async (filters?: AudiobookFilters): Promise<AudiobookListResponse> => {
    const queryParams = new URLSearchParams()
    if (filters) {
      if (filters.page) queryParams.append('page', filters.page.toString())
      if (filters.page_size) queryParams.append('page_size', filters.page_size.toString())
      if (filters.author) queryParams.append('author', filters.author)
      if (filters.narrator) queryParams.append('narrator', filters.narrator)
      if (filters.audio_quality) queryParams.append('audio_quality', filters.audio_quality)
      if (filters.requires_subscription) queryParams.append('requires_subscription', filters.requires_subscription)
      if (filters.is_published !== undefined) queryParams.append('is_published', filters.is_published.toString())
      if (filters.search_query) queryParams.append('search_query', filters.search_query)
      if (filters.genre_ids?.length) {
        filters.genre_ids.forEach(id => queryParams.append('genre_ids', id))
      }
      if (filters.sort_by) queryParams.append('sort_by', filters.sort_by)
      if (filters.sort_order) queryParams.append('sort_order', filters.sort_order)
    }

    const cacheKey = `audiobooks:${queryParams.toString()}`
    const cached = getCacheEntry<AudiobookListResponse>(cacheKey)
    if (cached) return cached

    const data = await api.get<AudiobookListResponse>(`/audiobooks?${queryParams.toString()}`)
    setCacheEntry(cacheKey, data, CACHE_TTL_LIST)
    return data
  },

  /**
   * Get single audiobook by ID
   * Returns user-safe response (no stream URL)
   */
  getAudiobookDetail: async (id: string): Promise<Audiobook> => {
    const cacheKey = `audiobook:${id}`
    const cached = getCacheEntry<Audiobook>(cacheKey)
    if (cached) return cached

    const data = await api.get<Audiobook>(`/audiobooks/${id}`)
    setCacheEntry(cacheKey, data, CACHE_TTL_LIST)
    return data
  },

  /**
   * Get stream URL for audiobook (admin only)
   * Returns 403 Forbidden if user lacks admin permission
   */
  getAudiobookStream: async (id: string): Promise<AudiobookStreamResponse> => {
    return await api.get<AudiobookStreamResponse>(`/audiobooks/${id}/stream`)
  },

  /**
   * Get featured audiobooks for carousel
   * Cached for 5 minutes
   * @param limit Maximum number of featured audiobooks to return
   */
  getFeaturedAudiobooks: async (limit: number = 10): Promise<Audiobook[]> => {
    const cacheKey = `audiobooks:featured:${limit}`
    const cached = getCacheEntry<Audiobook[]>(cacheKey)
    if (cached) return cached

    const queryParams = new URLSearchParams()
    queryParams.append('is_featured', 'true')
    queryParams.append('page_size', limit.toString())

    const response = await api.get<AudiobookListResponse>(`/audiobooks?${queryParams.toString()}`)
    setCacheEntry(cacheKey, response.items, CACHE_TTL_FEATURED)
    return response.items
  },

  /**
   * Search audiobooks by title, author, or narrator
   * Returns search suggestions for typeahead and full results
   */
  searchAudiobooks: async (query: string, limit: number = 10): Promise<AudiobookSearchResponse> => {
    if (!query || query.length < 2) {
      return { results: [], total: 0, query }
    }

    const queryParams = new URLSearchParams()
    queryParams.append('q', query)
    queryParams.append('content_types', 'audiobook')
    queryParams.append('limit', limit.toString())

    return await api.get<AudiobookSearchResponse>(`/search?${queryParams.toString()}`)
  },

  /**
   * Get search suggestions for typeahead
   * Suggests audiobooks by title, author, or narrator
   */
  getSearchSuggestions: async (query: string, limit: number = 5): Promise<AudiobookSearchSuggestion[]> => {
    if (!query || query.length < 2) {
      return []
    }

    const queryParams = new URLSearchParams()
    queryParams.append('q', query)
    queryParams.append('content_types', 'audiobook')
    queryParams.append('limit', limit.toString())

    const response = await api.get<{ suggestions: AudiobookSearchSuggestion[] }>(`/search/suggestions?${queryParams.toString()}`)
    return response.suggestions
  },

  /**
   * Get featured audiobooks organized by sections
   * Returns audiobooks grouped by category/section
   */
  getFeaturedBySection: async (): Promise<AudiobookFeaturedSection[]> => {
    const cacheKey = 'audiobooks:featured:sections'
    const cached = getCacheEntry<AudiobookFeaturedSection[]>(cacheKey)
    if (cached) return cached

    const data = await api.get<AudiobookFeaturedSection[]>('/audiobooks/featured/sections')
    setCacheEntry(cacheKey, data, CACHE_TTL_FEATURED)
    return data
  },

  /**
   * Clear all cached audiobook data
   * Useful after admin operations that modify audiobooks
   */
  clearCache: (): void => {
    const keysToDelete = Array.from(cache.keys()).filter(key => key.startsWith('audiobook'))
    keysToDelete.forEach(key => cache.delete(key))
  },
}

export default audiobookService
