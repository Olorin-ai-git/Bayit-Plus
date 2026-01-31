/**
 * Channel Chat Store
 *
 * Centralized state management for live TV channel chat functionality.
 * Supports multi-language chat messages with local caching per channel.
 *
 * Features:
 * - Per-channel message storage (max 200 messages per channel)
 * - Chat visibility and expand/collapse state
 * - Active channel tracking
 * - Persistent UI preferences (visibility, expansion)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ChatMessage {
  id: string;
  user_id: string;
  user_name: string;
  message: string;
  original_language: string;
  timestamp: string;
  is_pinned: boolean;
}

interface ChannelChatState {
  // State
  messagesByChannel: Record<string, ChatMessage[]>;
  activeChannelId: string | null;
  isChatVisible: boolean;
  isChatExpanded: boolean;

  // Actions
  addMessage: (channelId: string, message: ChatMessage) => void;
  setMessages: (channelId: string, messages: ChatMessage[]) => void;
  clearMessages: (channelId: string) => void;
  setActiveChannel: (channelId: string | null) => void;
  toggleChatVisibility: () => void;
  toggleChatExpanded: () => void;
  reset: () => void;
}

const MAX_MESSAGES_PER_CHANNEL = 200;

export const useChannelChatStore = create<ChannelChatState>()(
  persist(
    (set, get) => ({
      // Initial state
      messagesByChannel: {},
      activeChannelId: null,
      isChatVisible: false,
      isChatExpanded: false,

      /**
       * Add a new message to a channel's message list.
       * Automatically caps at 200 messages per channel (FIFO).
       *
       * @param channelId - Channel identifier
       * @param message - Message object to add
       */
      addMessage: (channelId: string, message: ChatMessage) => {
        const currentMessages = get().messagesByChannel[channelId] || [];
        const updatedMessages = [...currentMessages, message];

        // Cap at MAX_MESSAGES_PER_CHANNEL (remove oldest if exceeded)
        if (updatedMessages.length > MAX_MESSAGES_PER_CHANNEL) {
          updatedMessages.shift();
        }

        set({
          messagesByChannel: {
            ...get().messagesByChannel,
            [channelId]: updatedMessages,
          },
        });
      },

      /**
       * Replace all messages for a channel.
       * Used for initial load or full refresh.
       *
       * @param channelId - Channel identifier
       * @param messages - Array of messages (capped at 200)
       */
      setMessages: (channelId: string, messages: ChatMessage[]) => {
        const cappedMessages = messages.slice(-MAX_MESSAGES_PER_CHANNEL);

        set({
          messagesByChannel: {
            ...get().messagesByChannel,
            [channelId]: cappedMessages,
          },
        });
      },

      /**
       * Clear all messages for a specific channel.
       *
       * @param channelId - Channel identifier
       */
      clearMessages: (channelId: string) => {
        const { [channelId]: _, ...rest } = get().messagesByChannel;
        set({ messagesByChannel: rest });
      },

      /**
       * Set the currently active channel.
       * Used to track which channel's chat is displayed.
       *
       * @param channelId - Channel identifier or null
       */
      setActiveChannel: (channelId: string | null) => {
        set({ activeChannelId: channelId });
      },

      /**
       * Toggle chat panel visibility.
       * Persisted to localStorage for user preference.
       * When opening chat, automatically expand it to show input box.
       */
      toggleChatVisibility: () => {
        const currentVisibility = get().isChatVisible;
        const newVisibility = !currentVisibility;

        set({
          isChatVisible: newVisibility,
          // Auto-expand when opening chat to show input box
          isChatExpanded: newVisibility ? true : get().isChatExpanded
        });
      },

      /**
       * Toggle chat panel expanded/collapsed state.
       * Persisted to localStorage for user preference.
       */
      toggleChatExpanded: () => {
        set({ isChatExpanded: !get().isChatExpanded });
      },

      /**
       * Reset store to initial state.
       * Clears all messages and resets preferences.
       */
      reset: () => {
        set({
          messagesByChannel: {},
          activeChannelId: null,
          isChatVisible: false,
          isChatExpanded: false,
        });
      },
    }),
    {
      name: 'bayit-channel-chat-store',
      partialize: (state) => ({
        isChatVisible: state.isChatVisible,
        // Don't persist isChatExpanded - always default to true when visible
      }),
      // Ensure chat is expanded when visible after hydration
      onRehydrateStorage: () => (state) => {
        if (state && state.isChatVisible) {
          state.isChatExpanded = true;
        }
      },
    }
  )
);

export default useChannelChatStore;
