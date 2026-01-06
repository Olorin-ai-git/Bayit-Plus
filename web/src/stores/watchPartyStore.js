import { create } from 'zustand'
import { partyService } from '../services/api'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'
const WS_BASE_URL = API_BASE_URL.replace('http', 'ws')

/**
 * Watch Party Store
 * Manages watch party state, WebSocket connection, and real-time events.
 */
export const useWatchPartyStore = create((set, get) => ({
  // Party state
  party: null,
  participants: [],
  messages: [],
  isConnected: false,
  isConnecting: false,
  error: null,

  // Playback sync state
  syncedPosition: 0,
  isPlaying: true,
  isHost: false,

  // WebSocket connection
  ws: null,

  /**
   * Create a new watch party
   */
  createParty: async (contentId, contentType, options = {}) => {
    set({ error: null })
    try {
      const party = await partyService.create({
        content_id: contentId,
        content_type: contentType,
        content_title: options.title,
        is_private: options.isPrivate ?? true,
        audio_enabled: options.audioEnabled ?? true,
        chat_enabled: options.chatEnabled ?? true,
        sync_playback: options.syncPlayback ?? true,
      })

      set({ party, isHost: true, participants: party.participants || [] })
      return party
    } catch (error) {
      set({ error: error.message || 'Failed to create party' })
      throw error
    }
  },

  /**
   * Join a party by room code
   */
  joinByCode: async (roomCode) => {
    set({ error: null })
    try {
      const party = await partyService.joinByCode(roomCode)
      set({
        party,
        isHost: false,
        participants: party.participants || [],
      })
      return party
    } catch (error) {
      set({ error: error.message || 'Failed to join party' })
      throw error
    }
  },

  /**
   * Connect to party WebSocket
   */
  connect: (partyId, token) => {
    const { ws: existingWs } = get()
    if (existingWs) {
      existingWs.close()
    }

    set({ isConnecting: true, error: null })

    const ws = new WebSocket(
      `${WS_BASE_URL}/ws/party/${partyId}?token=${token}`
    )

    ws.onopen = () => {
      set({ isConnected: true, isConnecting: false })
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      get().handleMessage(data)
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      set({ error: 'Connection error', isConnecting: false })
    }

    ws.onclose = () => {
      set({ isConnected: false, ws: null })
    }

    set({ ws })
  },

  /**
   * Handle incoming WebSocket messages
   */
  handleMessage: (data) => {
    const { type } = data

    switch (type) {
      case 'connected':
        set({
          party: data.party,
          participants: data.party.participants,
          isHost: data.party.host_id === data.user_id,
        })
        break

      case 'chat_message':
        set((state) => ({
          messages: [...state.messages, data.message],
        }))
        break

      case 'participant_joined':
        set((state) => ({
          participants: [
            ...state.participants,
            {
              user_id: data.user_id,
              user_name: data.user_name,
              is_muted: false,
              is_speaking: false,
            },
          ],
        }))
        break

      case 'participant_left':
        set((state) => ({
          participants: state.participants.filter(
            (p) => p.user_id !== data.user_id
          ),
        }))
        break

      case 'participant_state_changed':
        set((state) => ({
          participants: state.participants.map((p) =>
            p.user_id === data.user_id
              ? {
                  ...p,
                  is_muted: data.is_muted ?? p.is_muted,
                  is_speaking: data.is_speaking ?? p.is_speaking,
                }
              : p
          ),
        }))
        break

      case 'playback_sync':
        set({
          syncedPosition: data.position,
          isPlaying: data.is_playing,
        })
        break

      case 'host_changed':
        set((state) => ({
          party: state.party
            ? {
                ...state.party,
                host_id: data.new_host_id,
                host_name: data.new_host_name,
              }
            : null,
          isHost: state.party?.host_id === data.new_host_id,
        }))
        break

      case 'party_ended':
        set({
          party: null,
          participants: [],
          messages: [],
          isConnected: false,
        })
        break

      case 'pong':
        // Heartbeat response
        break

      case 'error':
        set({ error: data.message })
        break

      default:
        console.log('Unknown message type:', type)
    }
  },

  /**
   * Send a chat message
   */
  sendMessage: (message, messageType = 'text') => {
    const { ws, isConnected } = get()
    if (!ws || !isConnected) return

    ws.send(
      JSON.stringify({
        type: 'chat',
        message,
        message_type: messageType,
      })
    )
  },

  /**
   * Sync playback position (host only)
   */
  syncPlayback: (position, isPlaying = true) => {
    const { ws, isConnected, isHost } = get()
    if (!ws || !isConnected || !isHost) return

    ws.send(
      JSON.stringify({
        type: 'sync',
        position,
        is_playing: isPlaying,
      })
    )
  },

  /**
   * Update participant state (mute/speaking)
   */
  updateState: (isMuted, isSpeaking) => {
    const { ws, isConnected } = get()
    if (!ws || !isConnected) return

    ws.send(
      JSON.stringify({
        type: 'state',
        is_muted: isMuted,
        is_speaking: isSpeaking,
      })
    )
  },

  /**
   * Leave the current party
   */
  leaveParty: async () => {
    const { ws, party } = get()

    if (ws) {
      ws.close()
    }

    if (party) {
      try {
        await partyService.leaveParty(party.id)
      } catch (error) {
        console.error('Failed to leave party:', error)
      }
    }

    set({
      party: null,
      participants: [],
      messages: [],
      isConnected: false,
      ws: null,
      isHost: false,
      error: null,
    })
  },

  /**
   * End the party (host only)
   */
  endParty: async () => {
    const { party, isHost, ws } = get()

    if (!party || !isHost) return

    try {
      await partyService.endParty(party.id)

      if (ws) {
        ws.close()
      }

      set({
        party: null,
        participants: [],
        messages: [],
        isConnected: false,
        ws: null,
        isHost: false,
      })
    } catch (error) {
      set({ error: error.message || 'Failed to end party' })
      throw error
    }
  },

  /**
   * Load chat history
   */
  loadChatHistory: async () => {
    const { party } = get()
    if (!party) return

    try {
      const messages = await partyService.getChatHistory(party.id, 50)
      set({ messages: messages || [] })
    } catch (error) {
      console.error('Failed to load chat history:', error)
    }
  },

  /**
   * Clear error
   */
  clearError: () => set({ error: null }),
}))

export default useWatchPartyStore
