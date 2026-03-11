/**
 * Direct Messages Service
 *
 * API client for DM conversation and messaging endpoints.
 */

import { api } from "@bayit/shared-services/api";
import type { DMMessage, ConversationSummary } from "@/stores/dmTypes";

interface ConversationsResponse {
  conversations: ConversationSummary[];
}

interface MessagesResponse {
  messages: DMMessage[];
}

interface TranslateResponse {
  translated_text: string;
}

export const dmService = {
  getConversations: (): Promise<ConversationsResponse> =>
    api.get("/dm/conversations"),

  getMessages: (
    friendId: string,
    limit: number,
    before?: string,
  ): Promise<MessagesResponse> =>
    api.get(`/dm/messages/${friendId}`, { params: { limit, before } }),

  sendMessage: (
    friendId: string,
    message: string,
    messageType: string = "text",
  ): Promise<DMMessage> =>
    api.post(`/dm/messages/${friendId}`, {
      message,
      message_type: messageType,
    }),

  markRead: (messageId: string): Promise<void> =>
    api.post(`/dm/messages/${messageId}/read`),

  markAllRead: (friendId: string): Promise<void> =>
    api.post(`/dm/conversations/${friendId}/read-all`),

  translateMessage: (messageId: string): Promise<TranslateResponse> =>
    api.post(`/dm/messages/${messageId}/translate`),

  addReaction: (messageId: string, emoji: string): Promise<void> =>
    api.post(`/dm/messages/${messageId}/reactions`, { emoji }),

  removeReaction: (messageId: string, emoji: string): Promise<void> =>
    api.delete(`/dm/messages/${messageId}/reactions`, { data: { emoji } }),
};
