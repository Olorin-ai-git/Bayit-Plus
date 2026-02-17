/**
 * useMultiCharacterInteraction
 *
 * Manages multi-character dialogue sessions: addressing specific characters,
 * sending messages, and sequencing response playback with reaction overlays.
 */

import { useState, useCallback, useRef } from 'react'
import api from '../services/api'
import logger from '@/utils/logger'

const log = logger.scope('useMultiCharacterInteraction')

const REACTION_FADE_DELAY_MS = parseInt(import.meta.env.VITE_REACTION_FADE_DELAY || '300', 10)

export interface MultiCharacter {
  name: string
  voice_id: string
  frame_url: string
  description: string
  movie_context: string
}

export interface CharacterExchange {
  speaker: 'user' | string
  message_text: string
  audio_url?: string
  animated_video_url?: string
  character_name?: string
  is_reaction?: boolean
  timestamp: string
}

interface MultiMessageResponse {
  exchanges: CharacterExchange[]
  primary_response: CharacterExchange
  reactions: CharacterExchange[]
}

interface UseMultiCharacterInteractionResult {
  addressedCharacter: MultiCharacter | null
  isMultiCharMode: boolean
  characters: MultiCharacter[]
  isSending: boolean
  setCharacters: (chars: MultiCharacter[]) => void
  setAddressedCharacter: (char: MultiCharacter) => void
  setMultiCharMode: (enabled: boolean) => void
  sendMultiCharacterMessage: (
    sessionId: string,
    message: string,
    addressedCharacter: MultiCharacter
  ) => Promise<MultiMessageResponse | null>
  playResponseSequence: (
    exchanges: CharacterExchange[],
    onVideoPlay: (url: string) => void,
    onReactionAppear: (exchange: CharacterExchange) => void
  ) => Promise<void>
}

export function useMultiCharacterInteraction(): UseMultiCharacterInteractionResult {
  const [addressedCharacter, setAddressedCharacter] = useState<MultiCharacter | null>(null)
  const [isMultiCharMode, setMultiCharMode] = useState(false)
  const [characters, setCharacters] = useState<MultiCharacter[]>([])
  const [isSending, setIsSending] = useState(false)

  const playbackAbortRef = useRef(false)

  const sendMultiCharacterMessage = useCallback(
    async (
      sessionId: string,
      message: string,
      addressed: MultiCharacter
    ): Promise<MultiMessageResponse | null> => {
      setIsSending(true)
      try {
        const response: MultiMessageResponse = await api.post(
          `/vod-interactions/sessions/${sessionId}/multi-message`,
          {
            message,
            addressed_character: addressed.name,
          }
        )
        return response
      } catch (err) {
        log.error('Failed to send multi-character message', err)
        return null
      } finally {
        setIsSending(false)
      }
    },
    []
  )

  const waitMs = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms))

  const playResponseSequence = useCallback(
    async (
      exchanges: CharacterExchange[],
      onVideoPlay: (url: string) => void,
      onReactionAppear: (exchange: CharacterExchange) => void
    ): Promise<void> => {
      playbackAbortRef.current = false

      for (const exchange of exchanges) {
        if (playbackAbortRef.current) break

        if (exchange.animated_video_url && !exchange.is_reaction) {
          onVideoPlay(exchange.animated_video_url)
          await waitMs(REACTION_FADE_DELAY_MS)
        }

        if (exchange.is_reaction) {
          onReactionAppear(exchange)
          await waitMs(REACTION_FADE_DELAY_MS)
        }
      }
    },
    []
  )

  return {
    addressedCharacter,
    isMultiCharMode,
    characters,
    isSending,
    setCharacters,
    setAddressedCharacter,
    setMultiCharMode,
    sendMultiCharacterMessage,
    playResponseSequence,
  }
}
