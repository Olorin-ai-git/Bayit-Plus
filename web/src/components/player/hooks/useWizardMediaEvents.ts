/**
 * useWizardMediaEvents Hook
 * Listens for media:control and media:subtitles custom events dispatched
 * by the wizard voice action handler. Routes commands to VideoPlayer
 * control functions and subtitle handlers.
 */

import { useEffect } from 'react'
import { PlayerControls, PlayerState } from '../types'
import logger from '@/utils/logger'

const mediaLogger = logger.scope('WizardMediaEvents')

interface MediaControlDetail {
  command: string
  value?: number
}

interface MediaSubtitlesDetail {
  language?: string
  enabled?: boolean
}

interface UseWizardMediaEventsOptions {
  controls: PlayerControls
  state: PlayerState
  videoRef: React.RefObject<HTMLVideoElement>
  onSubtitleToggle: (enabled: boolean) => void
  onSubtitleLanguageChange: (language: string | null) => void
}

export function useWizardMediaEvents({
  controls,
  state,
  videoRef,
  onSubtitleToggle,
  onSubtitleLanguageChange,
}: UseWizardMediaEventsOptions) {
  useEffect(() => {
    const handleMediaControl = (event: Event) => {
      const { command, value } = (event as CustomEvent<MediaControlDetail>).detail

      mediaLogger.info('Media control received', { command, value })

      switch (command) {
        case 'play':
        case 'resume':
          if (!state.isPlaying) {
            controls.togglePlay()
          }
          break

        case 'pause':
          if (state.isPlaying) {
            controls.togglePlay()
          }
          break

        case 'stop':
          if (state.isPlaying) {
            controls.togglePlay()
          }
          if (videoRef.current) {
            videoRef.current.currentTime = 0
          }
          break

        case 'seek':
          if (typeof value === 'number') {
            controls.seekToTime(value)
          }
          break

        case 'mute':
          if (!state.isMuted) {
            controls.toggleMute()
          }
          break

        case 'unmute':
          if (state.isMuted) {
            controls.toggleMute()
          }
          break

        default:
          mediaLogger.warn('Unknown media control command', { command })
      }
    }

    const handleMediaSubtitles = (event: Event) => {
      const { language, enabled } = (event as CustomEvent<MediaSubtitlesDetail>).detail

      mediaLogger.info('Media subtitles received', { language, enabled })

      if (enabled === false) {
        onSubtitleToggle(false)
        return
      }

      if (language) {
        onSubtitleLanguageChange(language)
      }

      if (enabled === true) {
        onSubtitleToggle(true)
      }
    }

    window.addEventListener('media:control', handleMediaControl)
    window.addEventListener('media:subtitles', handleMediaSubtitles)

    mediaLogger.info('Wizard media event listeners registered')

    return () => {
      window.removeEventListener('media:control', handleMediaControl)
      window.removeEventListener('media:subtitles', handleMediaSubtitles)
    }
  }, [controls, state.isPlaying, state.isMuted, videoRef, onSubtitleToggle, onSubtitleLanguageChange])
}
