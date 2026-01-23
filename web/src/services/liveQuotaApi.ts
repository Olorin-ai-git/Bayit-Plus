/**
 * Live Feature Quota API Client
 * Provides methods for checking and monitoring live feature usage
 */

import axios from 'axios'
import logger from '@/utils/logger'

const quotaLogger = logger.scope('QuotaAPI')

// Get base URL from environment
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

// Create axios instance with auth interceptor
const quotaApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
quotaApi.interceptors.request.use((config) => {
  const authData = JSON.parse(localStorage.getItem('bayit-auth') || '{}')
  if (authData?.state?.token) {
    config.headers.Authorization = `Bearer ${authData.state.token}`
  }
  return config
})

// Response interceptor
quotaApi.interceptors.response.use(
  (response) => response.data,
  (error) => {
    quotaLogger.error('Quota API error', {
      url: error.config?.url,
      status: error.response?.status,
      error: error.response?.data || error.message,
    })
    throw error
  }
)

export interface UsageStats {
  subtitle_usage_current_hour: number
  subtitle_usage_current_day: number
  subtitle_usage_current_month: number
  subtitle_minutes_per_hour: number
  subtitle_minutes_per_day: number
  subtitle_minutes_per_month: number
  subtitle_available_hour: number
  subtitle_available_day: number
  subtitle_available_month: number
  accumulated_subtitle_minutes: number
  dubbing_usage_current_hour: number
  dubbing_usage_current_day: number
  dubbing_usage_current_month: number
  dubbing_minutes_per_hour: number
  dubbing_minutes_per_day: number
  dubbing_minutes_per_month: number
  dubbing_available_hour: number
  dubbing_available_day: number
  dubbing_available_month: number
  accumulated_dubbing_minutes: number
  estimated_cost_current_month: number
  warning_threshold_percentage: number
}

export interface AvailabilityCheck {
  allowed: boolean
  error: string | null
  usage: UsageStats
}

export const liveQuotaApi = {
  /**
   * Get current user's usage statistics
   */
  async getMyUsage(): Promise<UsageStats> {
    try {
      quotaLogger.debug('Fetching usage stats')
      const stats = await quotaApi.get<UsageStats>('/live/quota/my-usage')
      return stats as UsageStats
    } catch (error) {
      quotaLogger.error('Failed to fetch usage stats', { error })
      throw error
    }
  },

  /**
   * Check if user can start a new feature session
   * @param featureType - 'subtitle' or 'dubbing'
   */
  async checkAvailability(featureType: 'subtitle' | 'dubbing'): Promise<AvailabilityCheck> {
    try {
      quotaLogger.debug('Checking availability', { featureType })
      const result = await quotaApi.get<AvailabilityCheck>(
        `/live/quota/check/${featureType}`
      )
      return result as AvailabilityCheck
    } catch (error) {
      quotaLogger.error('Failed to check availability', { featureType, error })
      // Return safe default on error
      return {
        allowed: false,
        error: 'Failed to check availability',
        usage: {} as UsageStats,
      }
    }
  },

  /**
   * Get session history for current user
   * @param limit - Number of sessions to fetch
   * @param offset - Pagination offset
   */
  async getSessionHistory(limit: number = 20, offset: number = 0) {
    try {
      quotaLogger.debug('Fetching session history', { limit, offset })
      return await quotaApi.get('/live/quota/session-history', {
        params: { limit, offset },
      })
    } catch (error) {
      quotaLogger.error('Failed to fetch session history', { error })
      throw error
    }
  },
}

export default liveQuotaApi
