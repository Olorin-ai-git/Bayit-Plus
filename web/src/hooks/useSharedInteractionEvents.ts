/**
 * useSharedInteractionEvents
 *
 * Processes incoming party WebSocket event payloads for the shared
 * interaction feature. Returns a handler function for use by useSharedInteraction.
 */

import { useCallback } from 'react'
import logger from '@/utils/logger'
import type { SharedSession, SharedParticipant, SharedExchange } from './useSharedInteraction'

const log = logger.scope('useSharedInteractionEvents')

interface EventHandlerDeps {
  currentUserId: string | null
  setSession: (s: SharedSession | null) => void
  setParticipants: React.Dispatch<React.SetStateAction<SharedParticipant[]>>
  setCurrentTurnUserId: (id: string | null) => void
  setConversation: React.Dispatch<React.SetStateAction<SharedExchange[]>>
  setTurnCountdown: (n: number | null) => void
  startCountdown: (seconds: number) => void
  stopCountdown: () => void
  turnWarningThreshold: number
}

export function useSharedInteractionEvents({
  currentUserId,
  setSession,
  setParticipants,
  setCurrentTurnUserId,
  setConversation,
  setTurnCountdown,
  startCountdown,
  stopCountdown,
  turnWarningThreshold,
}: EventHandlerDeps) {
  return useCallback(
    (eventType: string, data: Record<string, unknown>) => {
      switch (eventType) {
        case 'interaction_start':
          setSession(data.session as SharedSession)
          setParticipants((data.participants as SharedParticipant[]) ?? [])
          setCurrentTurnUserId((data.first_turn_user_id as string) ?? null)
          setConversation([])
          break

        case 'turn_change':
          stopCountdown()
          setCurrentTurnUserId((data.user_id as string) ?? null)
          if (data.user_id === currentUserId && typeof data.turn_duration_seconds === 'number') {
            startCountdown(data.turn_duration_seconds as number)
          }
          break

        case 'character_response':
          setConversation((prev) => [
            ...prev,
            {
              speaker: 'character',
              character_name: data.character_name as string,
              message_text: data.response_text as string,
              audio_url: data.audio_url as string | undefined,
              animated_video_url: data.animated_video_url as string | undefined,
              timestamp: new Date().toISOString(),
            } as SharedExchange,
          ])
          break

        case 'turn_warning':
          if (typeof data.seconds_remaining === 'number' && (data.seconds_remaining as number) <= turnWarningThreshold) {
            setTurnCountdown(data.seconds_remaining as number)
          }
          break

        case 'turn_skipped':
          stopCountdown()
          setCurrentTurnUserId((data.next_user_id as string) ?? null)
          break

        case 'interaction_end':
          stopCountdown()
          setSession(null)
          setCurrentTurnUserId(null)
          setConversation([])
          break

        default:
          log.debug('Unhandled interaction event', { eventType })
      }
    },
    [currentUserId, setSession, setParticipants, setCurrentTurnUserId, setConversation, setTurnCountdown, startCountdown, stopCountdown, turnWarningThreshold]
  )
}
