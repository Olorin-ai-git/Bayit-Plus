/**
 * Custom hook for channel chat - WebSocket connection, messages, auto-reconnection
 */
import { useState, useCallback, useRef, useEffect } from 'react'
import channelChatService, {
  ChatMessageData, ConnectedData, UserJoinData, UserLeftData,
  ReactionUpdateData, MessageDeletedData, UserMutedData, UserUnmutedData,
} from '@/services/channelChatService'

const MAX_MESSAGES = 200
const MAX_RETRIES = 5
const BASE_DELAY = 1000
const MAX_DELAY = 30000

export interface UseChannelChatOptions { channelId: string; autoConnect?: boolean }

export interface UseChannelChatState {
  isConnected: boolean
  isConnecting: boolean
  messages: ChatMessageData[]
  userCount: number
  isBetaUser: boolean
  translationEnabled: boolean
  error: string | null
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'reconnecting'
}

export function useChannelChat({ channelId, autoConnect = false }: UseChannelChatOptions) {
  const [state, setState] = useState<UseChannelChatState>({
    isConnected: false, isConnecting: false, messages: [], userCount: 0,
    isBetaUser: false, translationEnabled: false, error: null, connectionState: 'disconnected',
  })
  const sessionTokenRef = useRef<string | null>(null)
  const retryCountRef = useRef(0)
  const messageQueueRef = useRef<string[]>([])

  const handleConnected = useCallback((data: ConnectedData) => {
    sessionTokenRef.current = data.session_token
    setState((prev) => ({
      ...prev, isConnected: true, isConnecting: false, userCount: data.user_count,
      isBetaUser: data.is_beta_user, translationEnabled: data.translation_enabled,
      messages: data.recent_messages || [], error: null, connectionState: 'connected',
    }))
    retryCountRef.current = 0
    while (messageQueueRef.current.length > 0) {
      const msg = messageQueueRef.current.shift()
      if (msg && sessionTokenRef.current) channelChatService.sendMessage(msg, sessionTokenRef.current)
    }
  }, [])

  const handleMessage = useCallback((message: ChatMessageData) => {
    setState((prev) => ({ ...prev, messages: [...prev.messages, message].slice(-MAX_MESSAGES) }))
  }, [])

  const handleUserJoined = useCallback((data: UserJoinData) => {
    setState((prev) => ({ ...prev, userCount: data.user_count }))
  }, [])

  const handleUserLeft = useCallback((data: UserLeftData) => {
    setState((prev) => ({ ...prev, userCount: data.user_count }))
  }, [])

  const handleReactionUpdate = useCallback((data: ReactionUpdateData) => {
    setState((prev) => ({
      ...prev,
      messages: prev.messages.map((msg) => {
        if (msg.id !== data.message_id) return msg
        const reactions = { ...(msg.reactions || {}) }
        reactions[data.reaction] = (reactions[data.reaction] || 0) + 1
        return { ...msg, reactions }
      }),
    }))
  }, [])

  const handleMessageDeleted = useCallback((data: MessageDeletedData) => {
    setState((prev) => ({
      ...prev,
      messages: prev.messages.filter((msg) => msg.id !== data.message_id),
    }))
  }, [])

  const handleUserMuted = useCallback((_data: UserMutedData) => {
    // Could show a notification; for now just log via service
  }, [])

  const handleUserUnmuted = useCallback((_data: UserUnmutedData) => {
    // Could show a notification; for now just log via service
  }, [])

  const handleError = useCallback((_code: string, message: string, recoverable: boolean) => {
    setState((prev) => ({
      ...prev, error: message,
      isConnecting: recoverable && prev.isConnecting,
      isConnected: recoverable && prev.isConnected,
      connectionState: recoverable ? 'reconnecting' : 'disconnected',
    }))
  }, [])

  const buildCallbacks = useCallback(() => ({
    onConnected: handleConnected, onMessage: handleMessage,
    onUserJoined: handleUserJoined, onUserLeft: handleUserLeft,
    onReactionUpdate: handleReactionUpdate,
    onMessageDeleted: handleMessageDeleted,
    onUserMuted: handleUserMuted,
    onUserUnmuted: handleUserUnmuted,
    onError: handleError,
    onDisconnect: () => {
      setState((prev) => ({ ...prev, isConnected: false, isConnecting: false, connectionState: 'disconnected' }))
      if (retryCountRef.current < MAX_RETRIES) {
        const delay = Math.min(BASE_DELAY * Math.pow(2, retryCountRef.current), MAX_DELAY)
        retryCountRef.current++
        setState((prev) => ({ ...prev, connectionState: 'reconnecting' }))
        setTimeout(() => channelChatService.connect(channelId, buildCallbacks()), delay)
      }
    },
  }), [channelId, handleConnected, handleMessage, handleUserJoined, handleUserLeft,
    handleReactionUpdate, handleMessageDeleted, handleUserMuted, handleUserUnmuted, handleError])

  const connect = useCallback(() => {
    if (state.isConnecting || state.isConnected) return
    setState((prev) => ({ ...prev, isConnecting: true, error: null, connectionState: 'connecting' }))
    channelChatService.connect(channelId, buildCallbacks())
  }, [channelId, state.isConnecting, state.isConnected, buildCallbacks])

  const disconnect = useCallback(() => {
    channelChatService.disconnect()
    sessionTokenRef.current = null
    messageQueueRef.current = []
    retryCountRef.current = MAX_RETRIES
    setState((prev) => ({ ...prev, isConnected: false, isConnecting: false, connectionState: 'disconnected' }))
  }, [])

  const sendMessage = useCallback((text: string) => {
    if (!text || text.trim().length === 0) return
    if (!state.isConnected || !sessionTokenRef.current) {
      messageQueueRef.current.push(text.trim())
      return
    }
    channelChatService.sendMessage(text.trim(), sessionTokenRef.current)
  }, [state.isConnected])

  const reconnect = useCallback(() => {
    disconnect()
    retryCountRef.current = 0
    setTimeout(() => connect(), 100)
  }, [disconnect, connect])

  useEffect(() => {
    return () => { if (channelChatService.isServiceConnected()) channelChatService.disconnect() }
  }, [])

  useEffect(() => {
    if (autoConnect && channelId && !state.isConnected && !state.isConnecting) connect()
  }, [autoConnect, channelId, state.isConnected, state.isConnecting, connect])

  return { ...state, sendMessage, disconnect, reconnect }
}
