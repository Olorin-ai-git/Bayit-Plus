export interface DMMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  message: string;
  message_type: "text" | "image" | "voice";
  reactions: Record<string, string[]>;
  translated_text?: string;
  read: boolean;
  created_at: string;
}

export interface ConversationSummary {
  friend_id: string;
  friend_name: string;
  friend_avatar?: string;
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
}

export interface DMStoreState {
  conversations: ConversationSummary[];
  messages: DMMessage[];
  activeFriendId: string | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  totalUnread: number;
}

export interface DMStoreActions {
  fetchConversations: () => Promise<void>;
  fetchMessages: (friendId: string) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  sendMessage: (
    friendId: string,
    message: string,
    messageType?: "text" | "image" | "voice",
  ) => Promise<void>;
  markRead: (messageId: string) => Promise<void>;
  markAllRead: (friendId: string) => Promise<void>;
  translateMessage: (messageId: string) => Promise<void>;
  addReaction: (messageId: string, emoji: string) => Promise<void>;
  removeReaction: (messageId: string, emoji: string) => Promise<void>;
  connectWebSocket: (friendId: string) => void;
  disconnectWebSocket: () => void;
}
