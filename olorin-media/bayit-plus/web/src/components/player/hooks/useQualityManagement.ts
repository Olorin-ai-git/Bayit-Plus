import { useRef, useState, useEffect } from 'react'
import Hls from 'hls.js'
import logger from '@/utils/logger'
import { QualityOption } from '../types'
import api, { contentService } from '@bayit/shared/services/api'

interface StreamResponse {
  url: string
  type: string
  quality?: string
  available_qualities?: QualityOption[]
  is_drm_protected?: boolean
}

interface UseQualityManagementOptions {
  videoRef: React.RefObject<HTMLVideoElement>
  hlsRef: React.RefObject<Hls | null>
  contentId?: string
  isPlaying: boolean
  onStreamUrlChange: (url: string) => void
  onLoadingChange: (loading: boolean) => void
  isLive?: boolean
}

export function useQualityManagement({
  videoRef,
  hlsRef,
  contentId,
  isPlaying,
  onStreamUrlChange,
  onLoadingChange,
  isLive = false,
}: UseQualityManagementOptions) {
  const [currentQuality, setCurrentQuality] = useState<string | undefined>()
  const [availableQualities, setAvailableQualities] = useState<QualityOption[]>([])

  useEffect(() => {
    // Skip quality management for live content - HLS handles adaptive bitrate automatically
    if (!contentId || isLive) {
      logger.debug('Skipping quality fetch - live content uses adaptive bitrate', 'useQualityManagement', { isLive })
      return
    }

    const fetchQualities = async () => {
      try {
        const response = await contentService.getStreamUrl(contentId)
        if (response.data) {
          const qualities = response.data.available_qualities || []
          const qualitiesWithLabels = qualities.map((q) => ({
            ...q,
            label: q.quality === '4k' ? '4K Ultra HD' :
                   q.quality === '1080p' ? '1080p Full HD' :
                   q.quality === '720p' ? '720p HD' :
                   q.quality === '480p' ? '480p SD' :
                   q.quality?.toUpperCase() || 'Unknown',
          }))

          setCurrentQuality(response.data.quality)
          setAvailableQualities(qualitiesWithLabels)
        }
      } catch (error) {
        logger.error('Failed to fetch quality options', 'useQualityManagement', error)
      }
    }

    fetchQualities()
  }, [contentId, isLive])

  const changeQuality = async (quality: string) => {
    // Quality switching not supported for live content
    if (!contentId || isLive) {
      logger.warn('Quality switching not available for live content', 'useQualityManagement', { isLive })
      return
    }

    try {
      onLoadingChange(true)

      const savedTime = videoRef.current?.currentTime || 0
      const wasPlaying = isPlaying

      const response = await api.get<StreamResponse>(
        `/content/${contentId}/stream?quality=${quality}`
      )

      if (response.data?.url) {
        if (hlsRef.current) {
          hlsRef.current.destroy()
        }

        onStreamUrlChange(response.data.url)
        setCurrentQuality(quality)

        const checkReady = setInterval(() => {
          if (videoRef.current && videoRef.current.readyState >= 2) {
            clearInterval(checkReady)
            videoRef.current.currentTime = savedTime
            if (wasPlaying) {
              videoRef.current.play()
            }
            onLoadingChange(false)
          }
        }, 100)

        setTimeout(() => clearInterval(checkReady), 10000)
      }
    } catch (error) {
      logger.error('Failed to change quality', 'useQualityManagement', error)
      onLoadingChange(false)
    }
  }

  return {
    currentQuality,
    availableQualities,
    changeQuality,
  }
}
