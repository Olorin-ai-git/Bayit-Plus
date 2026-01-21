import { create } from 'zustand';
import { Platform } from 'react-native';
import { partyService } from '../services/api';
import { useAuthStore } from './authStore';

// Get WebSocket URL based on platform
const getWsBaseUrl = () => {
  if (!__DEV__) {
    return 'wss://api.bayit.tv/api/v1';
  }
  if (Platform.OS === 'web') {
    return 'ws://localhost:8000/api/v1';
  }
  if (Platform.OS === 'android') {
    return 'ws://10.0.2.2:8000/api/v1';
  }
  return 'ws://localhost:8000/api/v1';
};

const WS_BASE_URL = getWsBaseUrl();

interface Participant {
  user_id: string;
  user_name: string;
  is_muted: boolean;
  is_speaking: boolean;
}

interface ChatMessage {
  id: string;
  user_id: string;
  user_name: string;
  message: string;
  message_type: string;
  timestamp: string;
}

interface Party {
  id: string;
  host_id: string;
  host_name: string;
  content_id: string;
  content_type: string;
  room_code: string;
  audio_enabled: boolean;
  chat_enabled: boolean;
  sync_playback: boolean;
  participants: Participant[];
}

interface WatchPartyState {
  party: Party | null;
  participants: Participant[];
  messages: ChatMessage[];
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  syncedPosition: number;
  isPlaying: boolean;
  isHost: boolean;
  ws: WebSocket | null;

  createParty: (
    contentId: string,
    contentType: string,
    options?: {
      title?: string;
      isPrivate?: boolean;
      audioEnabled?: boolean;
      chatEnabled?: boolean;
      syncPlayback?: boolean;
    }
  ) => Promise<Party>;
  joinByCode: (roomCode: string) => Promise<Party>;
  connect: (partyId: string) => void;
  handleMessage: (data: any) => void;
  sendMessage: (message: string, messageType?: string) => void;
  syncPlayback: (position: number, isPlaying?: boolean) => void;
  updateState: (isMuted: boolean, isSpeaking: boolean) => void;
  leaveParty: () => Promise<void>;
  endParty: () => Promise<void>;
  loadChatHistory: () => Promise<void>;
  clearError: () => void;
}

export const useWatchPartyStore = create<WatchPartyState>((set, get) => ({
  party: null,
  participants: [],
  messages: [],
  isConnected: false,
  isConnecting: false,
  error: null,
  syncedPosition: 0,
  isPlaying: true,
  isHost: false,
  ws: null,

  createParty: async (contentId, contentType, options = {}) => {
    set({ error: null });
    try {
      const party = await partyService.create({
        content_id: contentId,
        content_type: contentType,
        content_title: options.title,
        is_private: options.isPrivate ?? true,
        audio_enabled: options.audioEnabled ?? true,
        chat_enabled: options.chatEnabled ?? true,
        sync_playback: options.syncPlayback ?? true,
      }) as Party;

      set({ party, isHost: true, participants: party.participants || [] });
      return party;
    } catch (error: any) {
      set({ error: error.message || 'Failed to create party' });
      throw error;
    }
  },

  joinByCode: async (roomCode) => {
    set({ error: null });
    try {
      const party = await partyService.joinByCode(roomCode) as any as Party;
      set({
        party,
        isHost: false,
        participants: party.participants || [],
      });
      return party;
    } catch (error: any) {
      set({ error: error.message || 'Failed to join party' });
      throw error;
    }
  },

  connect: (partyId) => {
    const { ws: existingWs } = get();
    if (existingWs) {
      existingWs.close();
    }

    const token = useAuthStore.getState().token;
    if (!token) {
      set({ error: 'Not authenticated' });
      return;
    }

    set({ isConnecting: true, error: null });

    const ws = new WebSocket(
      `${WS_BASE_URL}/ws/party/${partyId}?token=${token}`
    );

    ws.onopen = () => {
      set({ isConnected: true, isConnecting: false });
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      get().handleMessage(data);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      set({ error: 'Connection error', isConnecting: false });
    };

    ws.onclose = () => {
      set({ isConnected: false, ws: null });
    };

    set({ ws });
  },

  handleMessage: (data) => {
    const { type } = data;

    switch (type) {
      case 'connected':
        set({
          party: data.party,
          participants: data.party.participants,
          isHost: data.party.host_id === data.user_id,
        });
        break;

      case 'chat_message':
        set((state) => ({
          messages: [...state.messages, data.message],
        }));
        break;

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
        }));
        break;

      case 'participant_left':
        set((state) => ({
          participants: state.participants.filter(
            (p) => p.user_id !== data.user_id
          ),
        }));
        break;

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
        }));
        break;

      case 'playback_sync':
        set({
          syncedPosition: data.position,
          isPlaying: data.is_playing,
        });
        break;

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
        }));
        break;

      case 'party_ended':
        set({
          party: null,
          participants: [],
          messages: [],
          isConnected: false,
        });
        break;

      case 'pong':
        break;

      case 'error':
        set({ error: data.message });
        break;

      default:
        console.log('Unknown message type:', type);
    }
  },

  sendMessage: (message, messageType = 'text') => {
    const { ws, isConnected } = get();
    if (!ws || !isConnected) return;

    ws.send(
      JSON.stringify({
        type: 'chat',
        message,
        message_type: messageType,
      })
    );
  },

  syncPlayback: (position, isPlaying = true) => {
    const { ws, isConnected, isHost } = get();
    if (!ws || !isConnected || !isHost) return;

    ws.send(
      JSON.stringify({
        type: 'sync',
        position,
        is_playing: isPlaying,
      })
    );
  },

  updateState: (isMuted, isSpeaking) => {
    const { ws, isConnected } = get();
    if (!ws || !isConnected) return;

    ws.send(
      JSON.stringify({
        type: 'state',
        is_muted: isMuted,
        is_speaking: isSpeaking,
      })
    );
  },

  leaveParty: async () => {
    const { ws, party } = get();

    if (ws) {
      ws.close();
    }

    if (party) {
      try {
        await partyService.leaveParty(party.id);
      } catch (error) {
        console.error('Failed to leave party:', error);
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
    });
  },

  endParty: async () => {
    const { party, isHost, ws } = get();

    if (!party || !isHost) return;

    try {
      await partyService.endParty(party.id);

      if (ws) {
        ws.close();
      }

      set({
        party: null,
        participants: [],
        messages: [],
        isConnected: false,
        ws: null,
        isHost: false,
      });
    } catch (error: any) {
      set({ error: error.message || 'Failed to end party' });
      throw error;
    }
  },

  loadChatHistory: async () => {
    const { party } = get();
    if (!party) return;

    try {
      const response = await partyService.getChatHistory(party.id, 50) as any;
      const messages: ChatMessage[] = response.messages || response || [];
      set({ messages: messages || [] });
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  },

  clearError: () => set({ error: null }),
}));

export default useWatchPartyStore;
