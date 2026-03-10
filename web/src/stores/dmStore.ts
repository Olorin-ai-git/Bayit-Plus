import { create } from "zustand";
import { dmService } from "@/services/api";
import { connectDMWebSocket, disconnectDMWebSocket } from "./dmWsConnection";
import type {
  DMMessage,
  ConversationSummary,
  DMStoreState,
  DMStoreActions,
} from "./dmTypes";
import logger from "@bayit/shared-utils/logger";

export type { DMMessage, ConversationSummary } from "./dmTypes";

const dmLogger = logger.scope("DMStore");
type DMStore = DMStoreState & DMStoreActions;
const MESSAGE_PAGE_SIZE = 30;

export const useDMStore = create<DMStore>((set, get) => ({
  conversations: [],
  messages: [],
  activeFriendId: null,
  isLoading: false,
  isLoadingMore: false,
  hasMore: true,
  error: null,
  totalUnread: 0,

  fetchConversations: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await dmService.getConversations();
      const conversations = data.conversations || [];
      const totalUnread = conversations.reduce(
        (sum: number, c: ConversationSummary) => sum + c.unread_count,
        0,
      );
      set({ conversations, totalUnread, isLoading: false });
    } catch (err) {
      dmLogger.error("Failed to fetch conversations", { err });
      set({ error: "dm.error.fetchFailed", isLoading: false });
    }
  },

  fetchMessages: async (friendId) => {
    set({ isLoading: true, error: null, activeFriendId: friendId });
    try {
      const data = await dmService.getMessages(
        friendId,
        MESSAGE_PAGE_SIZE,
        undefined,
      );
      const messages = data.messages || [];
      set({
        messages,
        isLoading: false,
        hasMore: messages.length >= MESSAGE_PAGE_SIZE,
      });
    } catch (err) {
      dmLogger.error("Failed to fetch messages", { err });
      set({ error: "dm.error.fetchFailed", isLoading: false });
    }
  },

  loadMoreMessages: async () => {
    const { activeFriendId, messages, hasMore, isLoadingMore } = get();
    if (!activeFriendId || !hasMore || isLoadingMore) return;

    set({ isLoadingMore: true });
    try {
      const oldest = messages[0]?.created_at;
      const data = await dmService.getMessages(
        activeFriendId,
        MESSAGE_PAGE_SIZE,
        oldest,
      );
      const older = data.messages || [];
      set({
        messages: [...older, ...messages],
        isLoadingMore: false,
        hasMore: older.length >= MESSAGE_PAGE_SIZE,
      });
    } catch (err) {
      dmLogger.error("Failed to load more messages", { err });
      set({ isLoadingMore: false });
    }
  },

  sendMessage: async (friendId, message, messageType = "text") => {
    try {
      const data = await dmService.sendMessage(friendId, message, messageType);
      set((state) => ({ messages: [...state.messages, data] }));
    } catch (err) {
      dmLogger.error("Failed to send message", { err });
      set({ error: "dm.error.sendFailed" });
    }
  },

  markRead: async (messageId) => {
    try {
      await dmService.markRead(messageId);
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === messageId ? { ...m, read: true } : m,
        ),
      }));
    } catch (err) {
      dmLogger.error("Failed to mark read", { err });
    }
  },

  markAllRead: async (friendId) => {
    try {
      await dmService.markAllRead(friendId);
      set((state) => ({
        messages: state.messages.map((m) => ({ ...m, read: true })),
        conversations: state.conversations.map((c) =>
          c.friend_id === friendId ? { ...c, unread_count: 0 } : c,
        ),
        totalUnread: state.conversations.reduce(
          (sum, c) => sum + (c.friend_id === friendId ? 0 : c.unread_count),
          0,
        ),
      }));
    } catch (err) {
      dmLogger.error("Failed to mark all read", { err });
    }
  },

  translateMessage: async (messageId) => {
    try {
      const data = await dmService.translateMessage(messageId);
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === messageId
            ? { ...m, translated_text: data.translated_text }
            : m,
        ),
      }));
    } catch (err) {
      dmLogger.error("Failed to translate", { err });
    }
  },

  addReaction: async (messageId, emoji) => {
    try {
      await dmService.addReaction(messageId, emoji);
      await get().fetchMessages(get().activeFriendId!);
    } catch (err) {
      dmLogger.error("Failed to add reaction", { err });
    }
  },

  removeReaction: async (messageId, emoji) => {
    try {
      await dmService.removeReaction(messageId, emoji);
      await get().fetchMessages(get().activeFriendId!);
    } catch (err) {
      dmLogger.error("Failed to remove reaction", { err });
    }
  },

  connectWebSocket: (friendId) => {
    get().disconnectWebSocket();
    connectDMWebSocket(friendId, (data) => {
      set((state) => ({ messages: [...state.messages, data as DMMessage] }));
    });
  },

  disconnectWebSocket: () => {
    disconnectDMWebSocket();
  },
}));
