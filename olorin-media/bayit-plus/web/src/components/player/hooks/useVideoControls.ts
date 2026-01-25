import { RefObject } from 'react'
import logger from '@/utils/logger'
import { PlayerState, PlayerControls, Chapter } from '../types'

interface UseVideoControlsOptions {
  videoRef: RefObject<HTMLVideoElement>
  containerRef: RefObject<HTMLDivElement>
  state: PlayerState
  setState: React.Dispatch<React.SetStateAction<PlayerState>>
  contentId?: string
  onProgress?: (currentTime: number, duration: number) => void
  onQualityChange?: (quality: string) => Promise<void>
}

export function useVideoControls({
  videoRef,
  containerRef,
  state,
  setState,
  contentId,
  onProgress,
  onQualityChange,
}: UseVideoControlsOptions): PlayerControls {
  return {
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

    setVolume: (value: number) => {
      // Validate input is a finite number
      if (!isFinite(value) || isNaN(value)) {
        console.warn('Invalid volume value:', value)
        return
      }
      const clampedVolume = Math.max(0, Math.min(1, value))
      setState((prev) => ({ ...prev, volume: clampedVolume, isMuted: clampedVolume === 0 }))
      if (videoRef.current) {
        videoRef.current.volume = clampedVolume
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
      if (onQualityChange) {
        await onQualityChange(quality)
      }
    },

    skipToNextChapter: (chapters: Chapter[], currentTime: number) => {
      if (!videoRef.current || chapters.length === 0) return

      const nextChapter = chapters.find((ch) => ch.start_time > currentTime + 0.5)
      if (nextChapter) {
        videoRef.current.currentTime = nextChapter.start_time
      }
    },

    skipToPreviousChapter: (chapters: Chapter[], currentTime: number) => {
      if (!videoRef.current || chapters.length === 0) return

      const currentIndex = chapters.findIndex(
        (ch) => currentTime >= ch.start_time && currentTime < ch.end_time
      )

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
        const prevChapters = chapters.filter((ch) => ch.start_time < currentTime)
        if (prevChapters.length > 0) {
          videoRef.current.currentTime = prevChapters[prevChapters.length - 1].start_time
        } else {
          videoRef.current.currentTime = 0
        }
      }
    },
  }
}
