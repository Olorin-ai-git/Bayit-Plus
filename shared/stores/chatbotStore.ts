/**
 * Chatbot Store (Shared)
 * Global state for chatbot interaction across TV, tvOS, and web platforms
 */

import { create } from 'zustand';

export interface ChatbotContext {
  flows: Array<{ id: string; name: string; type: string }>;
  liveChannels: Array<{ id: string; name: string }>;
  radioStations: Array<{ id: string; name: string }>;
  vodCategories: Array<{ id: string; name: string }>;
  podcastShows: Array<{ id: string; name: string }>;
}

// Content item for show_multiple action
export interface ShowMultipleItem {
  name: string;
  type: 'channel' | 'movie' | 'series' | 'podcast' | 'radio' | 'any';
}

// Resolved content item with stream URL
export interface ResolvedContentItem {
  id: string;
  name: string;
  type: string;
  thumbnail?: string;
  streamUrl?: string;
  matchedName: string;
  confidence: number;
}

export interface ChatbotAction {
  type: 
    | 'create_flow' 
    | 'edit_flow' 
    | 'start_flow' 
    | 'search' 
    | 'navigate' 
    | 'download' 
    | 'add_to_watchlist' 
    | 'play'
    | 'show_multiple'  // Display multiple content items in widgets
    | 'chess_invite';  // Start chess game and invite friend
  payload: Record<string, any>;
}

// Typed payloads for specific actions
export interface ShowMultiplePayload {
  items: ShowMultipleItem[];
}

export interface ChessInvitePayload {
  friendName: string;
}

interface ChatbotStore {
  // State
  isOpen: boolean;
  pendingMessage: string | null;
  context: ChatbotContext | null;
  contextLoading: boolean;

  // Actions
  setOpen: (open: boolean) => void;
  sendMessage: (message: string) => void;
  clearPendingMessage: () => void;
  setContext: (context: ChatbotContext) => void;
  setContextLoading: (loading: boolean) => void;

  // Action handlers registration
  actionHandlers: Record<string, (payload: any) => void>;
  registerActionHandler: (type: string, handler: (payload: any) => void) => void;
  unregisterActionHandler: (type: string) => void;
  executeAction: (action: ChatbotAction) => void;
}

export const useChatbotStore = create<ChatbotStore>((set, get) => ({
  isOpen: false,
  pendingMessage: null,
  context: null,
  contextLoading: false,
  actionHandlers: {},

  setOpen: (open) => set({ isOpen: open }),

  sendMessage: (message) => {
    set({ pendingMessage: message, isOpen: true });
  },

  clearPendingMessage: () => set({ pendingMessage: null }),

  setContext: (context) => set({ context }),

  setContextLoading: (loading) => set({ contextLoading: loading }),

  registerActionHandler: (type, handler) => {
    set((state) => ({
      actionHandlers: { ...state.actionHandlers, [type]: handler },
    }));
  },

  unregisterActionHandler: (type) => {
    set((state) => {
      const { [type]: _, ...rest } = state.actionHandlers;
      return { actionHandlers: rest };
    });
  },

  executeAction: (action) => {
    const { actionHandlers } = get();
    const handler = actionHandlers[action.type];
    if (handler) {
      handler(action.payload);
    } else {
      console.warn(`[Chatbot] No handler registered for action type: ${action.type}`);
    }
  },
}));

export default useChatbotStore;
