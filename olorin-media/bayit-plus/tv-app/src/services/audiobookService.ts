/**
 * Audiobook API Service for tvOS
 * Reuses service patterns from web platform
 */

import api from './api'
import type {
  Audiobook,
  AudiobookListResponse,
  AudiobookFilters,
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
   * Get featured audiobooks for carousel (tvOS optimized)
   * Returns limited set with aggressive caching
   */
  getFeaturedAudiobooks: async (limit: number = 12): Promise<Audiobook[]> => {
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
   * Get featured audiobooks organized by sections
   * Returns audiobooks grouped by category for tvOS rows
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
   * Get single audiobook by ID
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
   * Get paginated audiobooks (for browsing)
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
    }

    const cacheKey = `audiobooks:${queryParams.toString()}`
    const cached = getCacheEntry<AudiobookListResponse>(cacheKey)
    if (cached) return cached

    const data = await api.get<AudiobookListResponse>(`/audiobooks?${queryParams.toString()}`)
    setCacheEntry(cacheKey, data, CACHE_TTL_LIST)
    return data
  },

  /**
   * Clear cache (after admin operations)
   */
  clearCache: (): void => {
    const keysToDelete = Array.from(cache.keys()).filter(key => key.startsWith('audiobook'))
    keysToDelete.forEach(key => cache.delete(key))
  },
}

export default audiobookService
