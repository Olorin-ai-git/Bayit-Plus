/**
 * Custom hook for channel chat - WebSocket connection, messages, auto-reconnection
 */
import { useState, useCallback, useRef, useEffect } from "react";
import channelChatService, {
  ChannelChatService,
} from "@/services/channelChatService";
import type {
  ChatMessageData,
  ConnectedData,
  UserJoinData,
  UserLeftData,
  ReactionUpdateData,
  MessageDeletedData,
  UserMutedData,
  UserUnmutedData,
} from "@/services/channelChatService";
import logger from "@/utils/logger";

const MAX_MESSAGES = 200;
const MAX_RETRIES = 5;
const BASE_DELAY = 1000;
const MAX_DELAY = 30000;

export interface UseChannelChatOptions {
  channelId: string;
  autoConnect?: boolean;
  isLive?: boolean;
}

export interface UseChannelChatState {
  isConnected: boolean;
  isConnecting: boolean;
  messages: ChatMessageData[];
  userCount: number;
  translationEnabled: boolean;
  error: string | null;
  connectionState: "disconnected" | "connecting" | "connected" | "reconnecting";
  hasMore: boolean;
  isLoadingMore: boolean;
}

export function useChannelChat({
  channelId,
  autoConnect = false,
  isLive = true,
}: UseChannelChatOptions) {
  const [state, setState] = useState<UseChannelChatState>({
    isConnected: false,
    isConnecting: false,
    messages: [],
    userCount: 0,
    translationEnabled: false,
    error: null,
    connectionState: "disconnected",
    hasMore: true,
    isLoadingMore: false,
  });
  const sessionTokenRef = useRef<string | null>(null);
  const retryCountRef = useRef(0);
  const messageQueueRef = useRef<string[]>([]);
  const isConnectingRef = useRef(false);
  const isConnectedRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelIdRef = useRef(channelId);
  const nextCursorRef = useRef<string | null>(null);
  channelIdRef.current = channelId;

  const handleConnected = useCallback((data: ConnectedData) => {
    sessionTokenRef.current = data.session_token;
    isConnectedRef.current = true;
    isConnectingRef.current = false;
    const recentMessages = data.recent_messages || [];
    nextCursorRef.current =
      recentMessages.length > 0 ? recentMessages[0].id : null;
    setState((prev) => ({
      ...prev,
      isConnected: true,
      isConnecting: false,
      userCount: data.user_count,
      translationEnabled: data.translation_enabled,
      messages: recentMessages,
      error: null,
      connectionState: "connected",
      hasMore: true,
      isLoadingMore: false,
    }));
    retryCountRef.current = 0;
    while (messageQueueRef.current.length > 0) {
      const msg = messageQueueRef.current.shift();
      if (msg && sessionTokenRef.current)
        channelChatService.sendMessage(msg, sessionTokenRef.current);
    }
  }, []);

  const handleMessage = useCallback((message: ChatMessageData) => {
    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, message].slice(-MAX_MESSAGES),
    }));
  }, []);

  const handleUserJoined = useCallback((data: UserJoinData) => {
    const systemMessage: ChatMessageData = {
      id: `system-join-${data.user_id}-${Date.now()}`,
      user_id: "system",
      user_name: data.user_name,
      message: `${data.user_name} joined the conversation...`,
      original_language: "en",
      timestamp: new Date().toISOString(),
      is_pinned: false,
      type: "system_join",
    };
    logger.info("User joined chat", "useChannelChat", {
      userName: data.user_name,
      userCount: data.user_count,
    });
    setState((prev) => ({
      ...prev,
      userCount: data.user_count,
      messages: [...prev.messages, systemMessage].slice(-MAX_MESSAGES),
    }));
  }, []);

  const handleUserLeft = useCallback((data: UserLeftData) => {
    const systemMessage: ChatMessageData = {
      id: `system-leave-${data.user_id}-${Date.now()}`,
      user_id: "system",
      user_name: "System",
      message: `${data.user_name || "A user"} left the conversation...`,
      original_language: "en",
      timestamp: new Date().toISOString(),
      is_pinned: false,
      type: "system_leave",
    };
    logger.info("User left chat", "useChannelChat", {
      userName: data.user_name,
      userCount: data.user_count,
    });
    setState((prev) => ({
      ...prev,
      userCount: data.user_count,
      messages: [...prev.messages, systemMessage].slice(-MAX_MESSAGES),
    }));
  }, []);

  const handleReactionUpdate = useCallback((data: ReactionUpdateData) => {
    setState((prev) => ({
      ...prev,
      messages: prev.messages.map((msg) => {
        if (msg.id !== data.message_id) return msg;
        const reactions = { ...(msg.reactions || {}) };
        reactions[data.reaction] = (reactions[data.reaction] || 0) + 1;
        return { ...msg, reactions };
      }),
    }));
  }, []);

  const handleMessageDeleted = useCallback((data: MessageDeletedData) => {
    setState((prev) => ({
      ...prev,
      messages: prev.messages.filter((msg) => msg.id !== data.message_id),
    }));
  }, []);

  const handleUserMuted = useCallback((_data: UserMutedData) => {}, []);

  const handleUserUnmuted = useCallback((_data: UserUnmutedData) => {}, []);

  const handleError = useCallback(
    (_code: string, message: string, recoverable: boolean) => {
      setState((prev) => ({
        ...prev,
        error: message,
        isConnecting: recoverable && prev.isConnecting,
        isConnected: recoverable && prev.isConnected,
        connectionState: recoverable ? "reconnecting" : "disconnected",
      }));
      if (!recoverable) {
        isConnectedRef.current = false;
        isConnectingRef.current = false;
      }
    },
    [],
  );

  const doConnect = useCallback(() => {
    if (isConnectingRef.current || isConnectedRef.current) return;
    isConnectingRef.current = true;
    setState((prev) => ({
      ...prev,
      isConnecting: true,
      error: null,
      connectionState: "connecting",
    }));
    channelChatService.connect(
      channelIdRef.current,
      {
        onConnected: handleConnected,
        onMessage: handleMessage,
        onUserJoined: handleUserJoined,
        onUserLeft: handleUserLeft,
        onReactionUpdate: handleReactionUpdate,
        onMessageDeleted: handleMessageDeleted,
        onUserMuted: handleUserMuted,
        onUserUnmuted: handleUserUnmuted,
        onError: handleError,
        onDisconnect: () => {
          isConnectedRef.current = false;
          isConnectingRef.current = false;
          setState((prev) => ({
            ...prev,
            isConnected: false,
            isConnecting: false,
            connectionState: "disconnected",
          }));
          if (retryCountRef.current < MAX_RETRIES) {
            const delay = Math.min(
              BASE_DELAY * Math.pow(2, retryCountRef.current),
              MAX_DELAY,
            );
            retryCountRef.current++;
            setState((prev) => ({ ...prev, connectionState: "reconnecting" }));
            reconnectTimerRef.current = setTimeout(() => doConnect(), delay);
          }
        },
      },
      isLive,
    );
  }, [
    handleConnected,
    handleMessage,
    handleUserJoined,
    handleUserLeft,
    handleReactionUpdate,
    handleMessageDeleted,
    handleUserMuted,
    handleUserUnmuted,
    handleError,
    isLive,
  ]);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    channelChatService.disconnect();
    sessionTokenRef.current = null;
    messageQueueRef.current = [];
    retryCountRef.current = MAX_RETRIES;
    isConnectedRef.current = false;
    isConnectingRef.current = false;
    setState((prev) => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
      connectionState: "disconnected",
    }));
  }, []);

  const sendMessage = useCallback((text: string) => {
    if (!text || text.trim().length === 0) return;
    if (!isConnectedRef.current || !sessionTokenRef.current) {
      messageQueueRef.current.push(text.trim());
      return;
    }
    channelChatService.sendMessage(text.trim(), sessionTokenRef.current);
  }, []);

  const loadOlderMessages = useCallback(async () => {
    if (state.isLoadingMore || !state.hasMore || !isConnectedRef.current)
      return;
    setState((prev) => ({ ...prev, isLoadingMore: true }));
    try {
      const response = await ChannelChatService.fetchHistory(
        channelIdRef.current,
        nextCursorRef.current || undefined,
        undefined,
        isLive,
      );
      nextCursorRef.current = response.next_cursor;
      setState((prev) => ({
        ...prev,
        messages: [...response.messages, ...prev.messages],
        hasMore: response.has_more,
        isLoadingMore: false,
      }));
    } catch (error) {
      logger.error("Failed to load older messages", "useChannelChat", error);
      setState((prev) => ({ ...prev, isLoadingMore: false }));
    }
  }, [state.isLoadingMore, state.hasMore, isLive]);

  const reconnect = useCallback(() => {
    disconnect();
    retryCountRef.current = 0;
    reconnectTimerRef.current = setTimeout(() => doConnect(), 100);
  }, [disconnect, doConnect]);

  useEffect(() => {
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (channelChatService.isServiceConnected())
        channelChatService.disconnect();
    };
  }, []);

  useEffect(() => {
    if (autoConnect && channelId) doConnect();
    return () => {
      disconnect();
    };
  }, [autoConnect, channelId]);

  return {
    ...state,
    connect: doConnect,
    sendMessage,
    disconnect,
    reconnect,
    loadOlderMessages,
  };
}
