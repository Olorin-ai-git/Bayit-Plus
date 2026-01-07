/**
 * Chatbot Store
 * Global state for chatbot interaction across components
 */

import { create } from 'zustand';
import { flowsService, contentService, liveService, radioService, podcastService } from '@/services/api';
import logger from '@/utils/logger';

export interface ChatbotContext {
  flows: Array<{ id: string; name: string; type: string }>;
  liveChannels: Array<{ id: string; name: string }>;
  radioStations: Array<{ id: string; name: string }>;
  vodCategories: Array<{ id: string; name: string }>;
  podcastShows: Array<{ id: string; name: string }>;
}

export interface ChatbotAction {
  type: 'create_flow' | 'edit_flow' | 'start_flow' | 'search' | 'navigate' | 'download' | 'add_to_watchlist';
  payload: Record<string, any>;
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
  loadContext: () => Promise<void>;

  // Action handlers registration
  actionHandlers: Record<string, (payload: any) => void>;
  registerActionHandler: (type: string, handler: (payload: any) => void) => void;
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

  loadContext: async () => {
    set({ contextLoading: true });
    try {
      const [flowsRes, liveRes, radioRes, podcastRes] = await Promise.all([
        flowsService.getFlows().catch(() => ({ data: [] })),
        liveService.getChannels().catch(() => ({ data: { channels: [] }, channels: [] })),
        radioService.getStations().catch(() => ({ data: { stations: [] }, stations: [] })),
        podcastService.getShows().catch(() => ({ data: { shows: [] }, shows: [] })),
      ]);

      // Extract flows
      const flows = (flowsRes.data || []).map((f: any) => ({
        id: f.id,
        name: f.name || f.name_en || 'Unnamed Flow',
        type: f.flow_type,
      }));

      // Extract live channels
      const channelsData = liveRes.data?.channels || liveRes.channels || liveRes.data || [];
      const liveChannels = channelsData.map((c: any) => ({
        id: c.id,
        name: c.name || c.title,
      }));

      // Extract radio stations
      const stationsData = radioRes.data?.stations || radioRes.stations || radioRes.data || [];
      const radioStations = stationsData.map((s: any) => ({
        id: s.id,
        name: s.name || s.title,
      }));

      // Extract podcast shows
      const showsData = podcastRes.data?.shows || podcastRes.shows || podcastRes.data || [];
      const podcastShows = showsData.map((p: any) => ({
        id: p.id,
        name: p.name || p.title,
      }));

      set({
        context: {
          flows,
          liveChannels,
          radioStations,
          vodCategories: [], // Would need separate API call
          podcastShows,
        },
        contextLoading: false,
      });
    } catch (error) {
      logger.error('Failed to load chatbot context', 'chatbotStore', error);
      set({ contextLoading: false });
    }
  },

  registerActionHandler: (type, handler) => {
    set((state) => ({
      actionHandlers: { ...state.actionHandlers, [type]: handler },
    }));
  },

  executeAction: (action) => {
    const { actionHandlers } = get();
    const handler = actionHandlers[action.type];
    if (handler) {
      handler(action.payload);
    } else {
      logger.warn(`No handler registered for action type: ${action.type}`, 'chatbotStore');
    }
  },
}));

export default useChatbotStore;
