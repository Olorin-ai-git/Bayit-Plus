/**
 * Custom hook for video player state and controls
 */

import { useRef, useState, useEffect, useCallback } from 'react'
import Hls from 'hls.js'
import logger from '@/utils/logger'
import { PlayerState, PlayerControls, QualityOption, Chapter } from '../types'
import api, { contentService } from '@bayit/shared/services/api'

interface UseVideoPlayerOptions {
  src: string
  isLive?: boolean
  autoPlay?: boolean
  onProgress?: (currentTime: number, duration: number) => void
  onEnded?: () => void
  contentId?: string
}

interface StreamResponse {
  url: string
  type: string
  quality?: string
  available_qualities?: QualityOption[]
  is_drm_protected?: boolean
}

export function useVideoPlayer({
  src,
  isLive = false,
  autoPlay = false,
  onProgress,
  onEnded,
  contentId,
}: UseVideoPlayerOptions) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const progressInterval = useRef<NodeJS.Timeout | null>(null)

  const [state, setState] = useState<PlayerState>({
    isPlaying: false,
    isMuted: false,
    isFullscreen: false,
    volume: 1,
    currentTime: 0,
    duration: 0,
    showControls: true,
    loading: true,
    currentQuality: undefined,
    availableQualities: [],
    playbackSpeed: 1,
  })
  const [currentStreamUrl, setCurrentStreamUrl] = useState(src)

  // Fetch available qualities when contentId changes
  useEffect(() => {
    if (!contentId) return

    const fetchQualities = async () => {
      try {
        const response = await contentService.getStreamUrl(contentId)
        if (response.data) {
          const qualities = response.data.available_qualities || []
          // Add labels to quality options
          const qualitiesWithLabels = qualities.map((q) => ({
            ...q,
            label: q.quality === '4k' ? '4K Ultra HD' :
                   q.quality === '1080p' ? '1080p Full HD' :
                   q.quality === '720p' ? '720p HD' :
                   q.quality === '480p' ? '480p SD' :
                   q.quality?.toUpperCase() || 'Unknown',
          }))

          setState((prev) => ({
            ...prev,
            currentQuality: response.data.quality,
            availableQualities: qualitiesWithLabels,
          }))
        }
      } catch (error) {
        logger.error('Failed to fetch quality options', 'useVideoPlayer', error)
      }
    }

    fetchQualities()
  }, [contentId])

  // Initialize HLS player
  useEffect(() => {
    if (!currentStreamUrl || !videoRef.current) return

    const video = videoRef.current

    if (Hls.isSupported() && currentStreamUrl.includes('.m3u8')) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: isLive,
      })
      hlsRef.current = hls
      hls.loadSource(currentStreamUrl)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setState((prev) => ({ ...prev, loading: false }))
        if (autoPlay) video.play()
      })
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          logger.error('HLS error', 'useVideoPlayer', data)
        }
      })
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = currentStreamUrl
      video.addEventListener('loadedmetadata', () => {
        setState((prev) => ({ ...prev, loading: false }))
        if (autoPlay) video.play()
      })
    } else {
      video.src = currentStreamUrl
      video.addEventListener('loadeddata', () => {
        setState((prev) => ({ ...prev, loading: false }))
        if (autoPlay) video.play()
      })
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
      }
    }
  }, [currentStreamUrl, isLive, autoPlay])

  // Update currentStreamUrl when src prop changes
  useEffect(() => {
    setCurrentStreamUrl(src)
  }, [src])

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      setState((prev) => ({
        ...prev,
        currentTime: video.currentTime,
        duration: video.duration || 0,
      }))
    }

    const handlePlay = () => setState((prev) => ({ ...prev, isPlaying: true }))
    const handlePause = () => setState((prev) => ({ ...prev, isPlaying: false }))
    const handleEnded = () => {
      setState((prev) => ({ ...prev, isPlaying: false }))
      if (onEnded) onEnded()
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('ended', handleEnded)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('ended', handleEnded)
    }
  }, [onEnded])

  // Progress reporting
  useEffect(() => {
    if (onProgress && state.isPlaying && !isLive) {
      progressInterval.current = setInterval(() => {
        if (videoRef.current && videoRef.current.duration && isFinite(videoRef.current.duration)) {
          onProgress(videoRef.current.currentTime, videoRef.current.duration)
        }
      }, 10000)
    }
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current)
      }
    }
  }, [state.isPlaying, isLive, onProgress])

  // Auto-hide controls
  useEffect(() => {
    let timeout: NodeJS.Timeout
    const handleMouseMove = () => {
      setState((prev) => ({ ...prev, showControls: true }))
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        if (state.isPlaying) setState((prev) => ({ ...prev, showControls: false }))
      }, 3000)
    }

    const container = containerRef.current
    container?.addEventListener('mousemove', handleMouseMove)
    container?.addEventListener('touchstart', handleMouseMove)

    return () => {
      container?.removeEventListener('mousemove', handleMouseMove)
      container?.removeEventListener('touchstart', handleMouseMove)
      clearTimeout(timeout)
    }
  }, [state.isPlaying])

  // Player controls
  const controls: PlayerControls = {
    togglePlay: () => {
      if (videoRef.current) {
        if (state.isPlaying) {
          videoRef.current.pause()
        } else {
          videoRef.current.play()
        }
      }
    },

    toggleMute: () => {
      if (videoRef.current) {
        videoRef.current.muted = !state.isMuted
        setState((prev) => ({ ...prev, isMuted: !prev.isMuted }))
      }
    },

    toggleFullscreen: () => {
      if (!document.fullscreenElement) {
        containerRef.current?.requestFullscreen()
        setState((prev) => ({ ...prev, isFullscreen: true }))
      } else {
        document.exitFullscreen()
        setState((prev) => ({ ...prev, isFullscreen: false }))
      }
    },

    handleVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const newVolume = parseFloat(e.target.value)
      setState((prev) => ({ ...prev, volume: newVolume, isMuted: newVolume === 0 }))
      if (videoRef.current) {
        videoRef.current.volume = newVolume
      }
    },

    handleSeek: (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const pos = (e.clientX - rect.left) / rect.width
      if (videoRef.current && state.duration) {
        videoRef.current.currentTime = pos * state.duration
      }
    },

    skip: (seconds: number) => {
      if (videoRef.current) {
        videoRef.current.currentTime += seconds
      }
    },

    seekToTime: (time: number) => {
      if (videoRef.current) {
        videoRef.current.currentTime = time
      }
    },

    handleRestart: async () => {
      if (videoRef.current) {
        videoRef.current.currentTime = 0
        setState((prev) => ({ ...prev, currentTime: 0 }))

        if (contentId && onProgress) {
          onProgress(0, state.duration)
        }
      }
    },

    formatTime: (time: number) => {
      if (!time || !isFinite(time)) return '0:00'
      const minutes = Math.floor(time / 60)
      const seconds = Math.floor(time % 60)
      return `${minutes}:${seconds.toString().padStart(2, '0')}`
    },

    setPlaybackSpeed: (speed: number) => {
      if (videoRef.current) {
        videoRef.current.playbackRate = speed
        setState((prev) => ({ ...prev, playbackSpeed: speed }))
      }
    },

    changeQuality: async (quality: string) => {
      if (!contentId) return

      try {
        setState((prev) => ({ ...prev, loading: true }))

        // Save current playback position and playing state
        const savedTime = videoRef.current?.currentTime || 0
        const wasPlaying = state.isPlaying

        // Fetch stream URL for the requested quality
        const response = await api.get<StreamResponse>(
          `/content/${contentId}/stream?quality=${quality}`
        )

        if (response.data?.url) {
          // Destroy current HLS instance
          if (hlsRef.current) {
            hlsRef.current.destroy()
            hlsRef.current = null
          }

          // Update current stream URL (this triggers the HLS re-initialization effect)
          setCurrentStreamUrl(response.data.url)

          // Update quality state
          setState((prev) => ({
            ...prev,
            currentQuality: quality,
            loading: true,
          }))

          // Wait for video to be ready and restore position
          const checkReady = setInterval(() => {
            if (videoRef.current && videoRef.current.readyState >= 2) {
              clearInterval(checkReady)
              videoRef.current.currentTime = savedTime
              if (wasPlaying) {
                videoRef.current.play()
              }
              setState((prev) => ({ ...prev, loading: false }))
            }
          }, 100)

          // Timeout safety
          setTimeout(() => clearInterval(checkReady), 10000)
        }
      } catch (error) {
        logger.error('Failed to change quality', 'useVideoPlayer', error)
        setState((prev) => ({ ...prev, loading: false }))
      }
    },

    skipToNextChapter: (chapters: Chapter[], currentTime: number) => {
      if (!videoRef.current || chapters.length === 0) return

      // Find the next chapter that starts after current time
      const nextChapter = chapters.find((ch) => ch.start_time > currentTime + 0.5)
      if (nextChapter) {
        videoRef.current.currentTime = nextChapter.start_time
      }
    },

    skipToPreviousChapter: (chapters: Chapter[], currentTime: number) => {
      if (!videoRef.current || chapters.length === 0) return

      // Find current chapter index
      const currentIndex = chapters.findIndex(
        (ch) => currentTime >= ch.start_time && currentTime < ch.end_time
      )

      // If we're more than 3 seconds into the current chapter, go to its start
      // Otherwise, go to the previous chapter
      if (currentIndex >= 0) {
        const currentChapter = chapters[currentIndex]
        if (currentTime - currentChapter.start_time > 3) {
          videoRef.current.currentTime = currentChapter.start_time
        } else if (currentIndex > 0) {
          videoRef.current.currentTime = chapters[currentIndex - 1].start_time
        } else {
          videoRef.current.currentTime = 0
        }
      } else if (chapters.length > 0) {
        // If not in any chapter, go to the last chapter that started before current time
        const prevChapters = chapters.filter((ch) => ch.start_time < currentTime)
        if (prevChapters.length > 0) {
          videoRef.current.currentTime = prevChapters[prevChapters.length - 1].start_time
        } else {
          videoRef.current.currentTime = 0
        }
      }
    },
  }

  return {
    videoRef,
    containerRef,
    state,
    controls,
  }
}
