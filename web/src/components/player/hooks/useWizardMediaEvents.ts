/**
 * useWizardMediaEvents Hook
 * Listens for media:control and media:subtitles custom events dispatched
 * by the wizard voice action handler. Routes commands to VideoPlayer
 * control functions and subtitle handlers.
 */

import { useEffect, useRef } from 'react'
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
  const controlsRef = useRef(controls)
  const stateRef = useRef(state)
  const subtitleToggleRef = useRef(onSubtitleToggle)
  const subtitleLangRef = useRef(onSubtitleLanguageChange)

  controlsRef.current = controls
  stateRef.current = state
  subtitleToggleRef.current = onSubtitleToggle
  subtitleLangRef.current = onSubtitleLanguageChange

  useEffect(() => {
    const handleMediaControl = (event: Event) => {
      const { command, value } = (event as CustomEvent<MediaControlDetail>).detail

      mediaLogger.info('Media control received', { command, value })

      switch (command) {
        case 'play':
        case 'resume':
          if (!stateRef.current.isPlaying) {
            controlsRef.current.togglePlay()
          }
          break

        case 'pause':
          if (stateRef.current.isPlaying) {
            controlsRef.current.togglePlay()
          }
          break

        case 'stop':
          if (stateRef.current.isPlaying) {
            controlsRef.current.togglePlay()
          }
          if (videoRef.current) {
            videoRef.current.currentTime = 0
          }
          break

        case 'seek':
          if (typeof value === 'number') {
            controlsRef.current.seekToTime(value)
          }
          break

        case 'mute':
          if (!stateRef.current.isMuted) {
            controlsRef.current.toggleMute()
          }
          break

        case 'unmute':
          if (stateRef.current.isMuted) {
            controlsRef.current.toggleMute()
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
        subtitleToggleRef.current(false)
        return
      }

      if (language) {
        subtitleLangRef.current(language)
      }

      if (enabled === true) {
        subtitleToggleRef.current(true)
      }
    }

    window.addEventListener('media:control', handleMediaControl)
    window.addEventListener('media:subtitles', handleMediaSubtitles)

    mediaLogger.debug('Wizard media event listeners registered')

    return () => {
      window.removeEventListener('media:control', handleMediaControl)
      window.removeEventListener('media:subtitles', handleMediaSubtitles)
    }
  }, [videoRef])
}
