import { useRef, useState, useEffect, useCallback } from 'react'
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
}

export function useVideoPlayer({
  src,
  isLive = false,
  autoPlay = false,
  initialSeekTime,
  onProgress,
  onEnded,
  contentId,
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

  useEffect(() => {
    setCurrentStreamUrl(src)
  }, [src])

  const handleReady = useCallback(() => {
    setState((prev) => ({ ...prev, loading: false }))
  }, [])

  const handleLoadingChange = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, loading }))
  }, [])

  const { hlsRef } = useHLSPlayer({
    videoRef,
    streamUrl: currentStreamUrl,
    isLive,
    autoPlay,
    onReady: handleReady,
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

  const handleTimeUpdate = useCallback((currentTime: number, duration: number) => {
    setState((prev) => ({ ...prev, currentTime, duration }))
  }, [])

  const handlePlay = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: true }))
  }, [])

  const handlePause = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: false }))
  }, [])

  useVideoEventListeners({
    videoRef,
    onTimeUpdate: handleTimeUpdate,
    onPlay: handlePlay,
    onPause: handlePause,
    onEnded,
  })

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

  const controls = useVideoControls({
    videoRef,
    containerRef,
    state,
    setState,
    contentId,
    onProgress,
    onQualityChange: changeQuality,
  })

  return {
    videoRef,
    containerRef,
    state,
    controls,
  }
}
