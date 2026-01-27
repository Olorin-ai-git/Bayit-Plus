import { useRef, useState, useEffect, useCallback } from 'react'
import logger from '@/utils/logger'
import { PlayerState, PlayerControls } from '../types'
import { useHLSPlayer } from './useHLSPlayer'
import { useVideoEventListeners } from './useVideoEventListeners'
import { useProgressReporting } from './useProgressReporting'
import { useInitialSeek } from './useInitialSeek'
import { useControlsAutoHide } from './useControlsAutoHide'
import { useQualityManagement } from './useQualityManagement'
import { useVideoControls } from './useVideoControls'

interface UseVideoPlayerOptions {
  src: string
  isLive?: boolean
  autoPlay?: boolean
  initialSeekTime?: number
  onProgress?: (currentTime: number, duration: number) => void
  onEnded?: () => void
  contentId?: string
  /** Whether the stream is being transcoded (affects seeking/duration) */
  isTranscoded?: boolean
  /** Known content duration in seconds (used for transcoded streams) */
  contentDuration?: number
}

export function useVideoPlayer({
  src,
  isLive = false,
  autoPlay = false,
  initialSeekTime,
  onProgress,
  onEnded,
  contentId,
  isTranscoded = false,
  contentDuration,
}: UseVideoPlayerOptions) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

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
  // For transcoded streams, track the seek offset (stream starts from this time)
  const [transcodeOffset, setTranscodeOffset] = useState(0)

  useEffect(() => {
    setCurrentStreamUrl(src)
    setTranscodeOffset(0) // Reset offset when source changes
  }, [src])

  // For transcoded streams, use the known content duration
  useEffect(() => {
    if (isTranscoded && contentDuration && contentDuration > 0) {
      setState((prev) => ({ ...prev, duration: contentDuration }))
    }
  }, [isTranscoded, contentDuration])

  const handleReady = useCallback(() => {
    setState((prev) => ({ ...prev, loading: false }))
    // Log comprehensive audio debug info when video is ready
    const video = videoRef.current
    if (video) {
      logger.info('Video ready - audio diagnostics', 'useVideoPlayer', {
        muted: video.muted,
        volume: video.volume,
        paused: video.paused,
        readyState: video.readyState,
        networkState: video.networkState,
        // Check if video has audio tracks
        audioTracksCount: (video as any).audioTracks?.length ?? 'not supported',
        // Check if video element is properly connected
        isConnected: video.isConnected,
        // Check duration (0 might indicate loading issue)
        duration: video.duration,
      })
    }
  }, [])

  const handleLoadingChange = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, loading }))
  }, [])

  // Called when browser autoplay policy requires muting
  const handleAutoplayMuted = useCallback(() => {
    logger.info('Browser autoplay policy required muting video', 'useVideoPlayer')
    setState((prev) => ({ ...prev, isMuted: true }))
  }, [])

  const { hlsRef } = useHLSPlayer({
    videoRef,
    streamUrl: currentStreamUrl,
    isLive,
    autoPlay,
    onReady: handleReady,
    onAutoplayMuted: handleAutoplayMuted,
  })

  const { currentQuality, availableQualities, changeQuality } = useQualityManagement({
    videoRef,
    hlsRef,
    contentId,
    isPlaying: state.isPlaying,
    onStreamUrlChange: setCurrentStreamUrl,
    onLoadingChange: handleLoadingChange,
    isLive,
  })

  useEffect(() => {
    setState((prev) => ({ ...prev, currentQuality, availableQualities }))
  }, [currentQuality, availableQualities])

  const handleTimeUpdate = useCallback((videoCurrentTime: number, videoDuration: number) => {
    // For transcoded streams, add the seek offset to get actual position
    // and use contentDuration instead of video element's duration (which may be Infinity)
    const actualCurrentTime = isTranscoded ? videoCurrentTime + transcodeOffset : videoCurrentTime
    const actualDuration = isTranscoded && contentDuration ? contentDuration : videoDuration
    setState((prev) => ({
      ...prev,
      currentTime: actualCurrentTime,
      // Only update duration if we have a valid value (not for transcoded streams from video element)
      duration: isTranscoded ? prev.duration : actualDuration,
    }))
  }, [isTranscoded, transcodeOffset, contentDuration])

  const handlePlay = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: true }))
    // When play starts, log comprehensive audio state for debugging
    const video = videoRef.current
    if (video) {
      logger.info('Play started - audio state check', 'useVideoPlayer', {
        videoDOMMuted: video.muted,
        videoDOMVolume: video.volume,
        audioTracksCount: (video as any).audioTracks?.length ?? 'not supported',
        // Check if video has media source
        srcSet: !!video.src || !!video.currentSrc,
        currentSrc: video.currentSrc,
        readyState: video.readyState,
      })
    }
  }, [])

  const handlePause = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: false }))
  }, [])

  const handleVolumeChange = useCallback((volume: number, muted: boolean) => {
    logger.debug('Video volumechange event', 'useVideoPlayer', { volume, muted })
    setState((prev) => ({ ...prev, volume, isMuted: muted }))
  }, [])

  // Sync video element's muted and volume state with React state
  // This ensures the video element always matches what React thinks it should be
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Log current state for debugging
    logger.debug('Audio state sync', 'useVideoPlayer', {
      reactMuted: state.isMuted,
      reactVolume: state.volume,
      videoMuted: video.muted,
      videoVolume: video.volume,
    })

    // Sync muted state
    if (video.muted !== state.isMuted) {
      logger.info('Syncing muted state', 'useVideoPlayer', {
        from: video.muted,
        to: state.isMuted,
      })
      video.muted = state.isMuted
    }
    // Sync volume
    if (video.volume !== state.volume) {
      logger.info('Syncing volume', 'useVideoPlayer', {
        from: video.volume,
        to: state.volume,
      })
      video.volume = state.volume
    }
  }, [state.isMuted, state.volume])

  useVideoEventListeners({
    videoRef,
    onTimeUpdate: handleTimeUpdate,
    onPlay: handlePlay,
    onPause: handlePause,
    onEnded,
    onVolumeChange: handleVolumeChange,
  })

  // Periodic audio check and auto-fix for desync
  useEffect(() => {
    const interval = setInterval(() => {
      const video = videoRef.current
      if (video && state.isPlaying) {
        const hasDesync = video.muted !== state.isMuted || video.volume !== state.volume
        logger.debug('Periodic audio check', 'useVideoPlayer', {
          reactMuted: state.isMuted,
          reactVolume: state.volume,
          videoDOMMuted: video.muted,
          videoDOMVolume: video.volume,
          currentTime: video.currentTime,
          hasDesync,
        })
        // Auto-fix desync if detected (user's intent from React state should win)
        if (hasDesync) {
          logger.warn('Audio desync detected, auto-fixing', 'useVideoPlayer', {
            fixingMuted: video.muted !== state.isMuted,
            fixingVolume: video.volume !== state.volume,
          })
          if (video.muted !== state.isMuted) {
            video.muted = state.isMuted
          }
          if (video.volume !== state.volume) {
            video.volume = state.volume
          }
        }
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [state.isPlaying, state.isMuted, state.volume])

  useProgressReporting({
    videoRef,
    isPlaying: state.isPlaying,
    isLive,
    onProgress,
  })

  useInitialSeek({
    videoRef,
    initialSeekTime,
    loading: state.loading,
    duration: state.duration,
  })

  useControlsAutoHide({
    containerRef,
    isPlaying: state.isPlaying,
    onShowControls: () => setState((prev) => ({ ...prev, showControls: true })),
    onHideControls: () => setState((prev) => ({ ...prev, showControls: false })),
  })

  // Callback for seeking in transcoded streams - reloads stream with new start time
  const handleTranscodedSeek = useCallback((seekTime: number) => {
    if (!src) return

    // Clamp seek time to valid range
    const clampedTime = Math.max(0, Math.min(seekTime, contentDuration || Infinity))

    logger.info('Transcoded seek - reloading stream', 'useVideoPlayer', {
      seekTime: clampedTime,
      originalSrc: src,
    })

    // Update offset so time display is correct
    setTranscodeOffset(clampedTime)

    // Show loading state
    setState((prev) => ({ ...prev, loading: true, currentTime: clampedTime }))

    // Build new URL with start parameter
    const baseUrl = src.split('?')[0]
    const newUrl = `${baseUrl}?start=${clampedTime}`
    setCurrentStreamUrl(newUrl)
  }, [src, contentDuration])

  const controls = useVideoControls({
    videoRef,
    containerRef,
    state,
    setState,
    contentId,
    onProgress,
    onQualityChange: changeQuality,
    isTranscoded,
    onTranscodedSeek: isTranscoded ? handleTranscodedSeek : undefined,
  })

  return {
    videoRef,
    containerRef,
    state,
    controls,
  }
}
