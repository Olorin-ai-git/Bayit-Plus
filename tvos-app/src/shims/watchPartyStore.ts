/**
 * Watch Party Store Shim for tvOS
 *
 * WebRTC/LiveKit is not supported on tvOS, so we provide a no-op store
 * that returns empty state and no-op functions.
 */

import { create } from 'zustand';

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
  reset: () => void;
}

// No-op store for tvOS
export const useWatchPartyStore = create<WatchPartyState>()((set, get) => ({
  party: null,
  participants: [],
  messages: [],
  isConnected: false,
  isConnecting: false,
  error: null,
  syncedPosition: 0,
  isPlaying: false,
  isHost: false,
  ws: null,

  // All functions are no-ops that return empty/rejected promises
  createParty: async () => {
    console.log('[tvOS] Watch Party not supported on this platform');
    throw new Error('Watch Party not supported on tvOS');
  },

  joinByCode: async () => {
    console.log('[tvOS] Watch Party not supported on this platform');
    throw new Error('Watch Party not supported on tvOS');
  },

  connect: () => {
    console.log('[tvOS] Watch Party not supported on this platform');
  },

  handleMessage: () => {},
  sendMessage: () => {},
  syncPlayback: () => {},
  updateState: () => {},

  leaveParty: async () => {},
  endParty: async () => {},
  reset: () => {},
}));

export default useWatchPartyStore;
