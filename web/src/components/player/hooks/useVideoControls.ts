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
  /** Whether this is a transcoded stream (affects seeking) */
  isTranscoded?: boolean
  /** Callback to seek in a transcoded stream by reloading with new start time */
  onTranscodedSeek?: (seekTime: number) => void
}

export function useVideoControls({
  videoRef,
  containerRef,
  state,
  setState,
  contentId,
  onProgress,
  onQualityChange,
  isTranscoded = false,
  onTranscodedSeek,
}: UseVideoControlsOptions): PlayerControls {
  return {
    togglePlay: () => {
      if (videoRef.current) {
        const video = videoRef.current
        if (state.isPlaying) {
          video.pause()
        } else {
          // Verify and fix audio state before playing
          logger.info('togglePlay - about to play', 'useVideoControls', {
            reactMuted: state.isMuted,
            reactVolume: state.volume,
            videoDOMMuted: video.muted,
            videoDOMVolume: video.volume,
          })
          // Ensure video muted state matches React state before playing
          // This fixes cases where video was incorrectly muted by autoplay
          if (video.muted !== state.isMuted) {
            logger.info('Fixing muted desync before play', 'useVideoControls', {
              from: video.muted,
              to: state.isMuted,
            })
            video.muted = state.isMuted
          }
          if (video.volume !== state.volume) {
            logger.info('Fixing volume desync before play', 'useVideoControls', {
              from: video.volume,
              to: state.volume,
            })
            video.volume = state.volume
          }
          video.play().then(() => {
            logger.info('Play succeeded', 'useVideoControls', {
              videoDOMMuted: video.muted,
              videoDOMVolume: video.volume,
            })
          }).catch((err) => {
            logger.warn('Play failed', 'useVideoControls', { error: err.message })
          })
        }
      }
    },

    toggleMute: () => {
      if (videoRef.current) {
        const video = videoRef.current
        const newMuted = !state.isMuted
        logger.info('Toggle mute', 'useVideoControls', {
          reactMuted: state.isMuted,
          newMuted,
          videoDOMMuted: video.muted,
          videoDOMVolume: video.volume,
        })
        // Force the video element to the new state
        video.muted = newMuted
        // If unmuting, also ensure volume is audible
        if (!newMuted && video.volume === 0) {
          video.volume = state.volume > 0 ? state.volume : 1
          logger.info('Restored volume on unmute', 'useVideoControls', { volume: video.volume })
        }
        setState((prev) => ({ ...prev, isMuted: newMuted }))
        // Verify the change took effect
        logger.info('After toggle mute verification', 'useVideoControls', {
          videoDOMMuted: video.muted,
          videoDOMVolume: video.volume,
          expectedMuted: newMuted,
          success: video.muted === newMuted,
        })
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
      const shouldBeMuted = newVolume === 0
      setState((prev) => ({ ...prev, volume: newVolume, isMuted: shouldBeMuted }))
      if (videoRef.current) {
        videoRef.current.volume = newVolume
        // Unmute if user is setting volume > 0, or mute if setting to 0
        videoRef.current.muted = shouldBeMuted
      }
    },

    setVolume: (value: number) => {
      // Validate input is a finite number
      if (!isFinite(value) || isNaN(value)) {
        logger.warn('Invalid volume value', 'useVideoControls', { value })
        return
      }
      const video = videoRef.current
      const clampedVolume = Math.max(0, Math.min(1, value))
      const shouldBeMuted = clampedVolume === 0
      logger.info('setVolume called', 'useVideoControls', {
        value,
        clampedVolume,
        shouldBeMuted,
        reactMuted: state.isMuted,
        videoDOMMuted: video?.muted,
        videoDOMVolume: video?.volume,
      })
      setState((prev) => ({ ...prev, volume: clampedVolume, isMuted: shouldBeMuted }))
      if (video) {
        video.volume = clampedVolume
        // Unmute if user is setting volume > 0, or mute if setting to 0
        video.muted = shouldBeMuted
        logger.info('After setVolume verification', 'useVideoControls', {
          videoDOMVolume: video.volume,
          videoDOMMuted: video.muted,
          expectedVolume: clampedVolume,
          expectedMuted: shouldBeMuted,
          volumeSuccess: video.volume === clampedVolume,
          mutedSuccess: video.muted === shouldBeMuted,
        })
      }
    },

    handleSeek: (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const pos = (e.clientX - rect.left) / rect.width
      if (state.duration) {
        const seekTime = pos * state.duration
        if (isTranscoded && onTranscodedSeek) {
          // For transcoded streams, reload with new start time
          logger.info('Transcoded seek', 'useVideoControls', { seekTime, duration: state.duration })
          onTranscodedSeek(seekTime)
        } else if (videoRef.current) {
          videoRef.current.currentTime = seekTime
        }
      }
    },

    skip: (seconds: number) => {
      const newTime = state.currentTime + seconds
      if (isTranscoded && onTranscodedSeek) {
        // For transcoded streams, reload with new start time
        const clampedTime = Math.max(0, Math.min(newTime, state.duration))
        logger.info('Transcoded skip', 'useVideoControls', { seconds, newTime: clampedTime })
        onTranscodedSeek(clampedTime)
      } else if (videoRef.current) {
        videoRef.current.currentTime += seconds
      }
    },

    seekToTime: (time: number) => {
      if (isTranscoded && onTranscodedSeek) {
        // For transcoded streams, reload with new start time
        logger.info('Transcoded seekToTime', 'useVideoControls', { time })
        onTranscodedSeek(time)
      } else if (videoRef.current) {
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
