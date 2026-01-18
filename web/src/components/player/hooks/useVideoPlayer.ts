/**
 * Custom hook for video player state and controls
 */

import { useRef, useState, useEffect } from 'react'
import Hls from 'hls.js'
import logger from '@/utils/logger'
import { PlayerState, PlayerControls } from '../types'

interface UseVideoPlayerOptions {
  src: string
  isLive?: boolean
  autoPlay?: boolean
  onProgress?: (currentTime: number, duration: number) => void
  onEnded?: () => void
  contentId?: string
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
  })

  // Initialize HLS player
  useEffect(() => {
    if (!src || !videoRef.current) return

    const video = videoRef.current

    if (Hls.isSupported() && src.includes('.m3u8')) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: isLive,
      })
      hlsRef.current = hls
      hls.loadSource(src)
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
      video.src = src
      video.addEventListener('loadedmetadata', () => {
        setState((prev) => ({ ...prev, loading: false }))
        if (autoPlay) video.play()
      })
    } else {
      video.src = src
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
  }, [src, isLive, autoPlay])

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
  }

  return {
    videoRef,
    containerRef,
    state,
    controls,
  }
}
