/**
 * useLiveFeatureQuota Hook
 * React hook for managing live feature quota and usage stats
 * Automatically refreshes usage every 30 seconds when mounted
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { liveQuotaApi, UsageStats, AvailabilityCheck } from '@/services/liveQuotaApi'
import logger from '@/utils/logger'

const quotaLogger = logger.scope('LiveQuota')

export function useLiveFeatureQuota() {
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Track if component is mounted to avoid state updates after unmount
  const isMountedRef = useRef<boolean>(true)

  const fetchUsage = useCallback(async () => {
    try {
      setLoading(true)
      const stats = await liveQuotaApi.getMyUsage()

      if (isMountedRef.current) {
        setUsageStats(stats)
        setError(null)
        quotaLogger.debug('Usage stats updated', {
          subtitle_usage: stats.subtitle_usage_current_hour,
          dubbing_usage: stats.dubbing_usage_current_hour,
        })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch usage'
      if (isMountedRef.current) {
        setError(errorMessage)
        quotaLogger.error('Failed to fetch usage stats', { error: errorMessage })
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [])

  const checkAvailability = useCallback(
    async (featureType: 'subtitle' | 'dubbing'): Promise<AvailabilityCheck> => {
      try {
        const result = await liveQuotaApi.checkAvailability(featureType)
        quotaLogger.debug('Availability check', {
          featureType,
          allowed: result.allowed,
        })
        return result
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Check failed'
        quotaLogger.error('Availability check failed', { featureType, error: errorMessage })
        return {
          allowed: false,
          error: errorMessage,
          usage: usageStats || ({} as UsageStats),
        }
      }
    },
    [usageStats]
  )

  // Fetch usage on mount
  useEffect(() => {
    isMountedRef.current = true
    fetchUsage()

    return () => {
      isMountedRef.current = false
    }
  }, [fetchUsage])

  // Refresh usage every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (isMountedRef.current) {
        fetchUsage()
      }
    }, 30000) // 30 seconds

    return () => {
      clearInterval(interval)
    }
  }, [fetchUsage])

  return {
    usageStats,
    loading,
    error,
    fetchUsage,
    checkAvailability,
  }
}

export default useLiveFeatureQuota
