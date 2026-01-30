/**
 * Custom hook for channel chat - WebSocket connection, messages, auto-reconnection
 */
import { useState, useCallback, useRef, useEffect } from 'react'
import channelChatService, {
  ChatMessageData, ConnectedData, UserJoinData, UserLeftData, ReactionUpdateData,
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
    sessionTokenRef.current = data.sessionToken
    setState((prev) => ({
      ...prev, isConnected: true, isConnecting: false, userCount: data.userCount,
      isBetaUser: data.isBetaUser, translationEnabled: data.translationEnabled,
      messages: data.recentMessages || [], error: null, connectionState: 'connected',
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
    setState((prev) => ({ ...prev, userCount: data.userCount }))
  }, [])

  const handleUserLeft = useCallback((data: UserLeftData) => {
    setState((prev) => ({ ...prev, userCount: data.userCount }))
  }, [])

  const handleReactionUpdate = useCallback((data: ReactionUpdateData) => {
    setState((prev) => ({
      ...prev,
      messages: prev.messages.map((msg) =>
        msg.id === data.messageId ? { ...msg, reactions: data.totalReactions } : msg
      ),
    }))
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
    onReactionUpdate: handleReactionUpdate, onError: handleError,
    onDisconnect: () => {
      setState((prev) => ({ ...prev, isConnected: false, isConnecting: false, connectionState: 'disconnected' }))
      if (retryCountRef.current < MAX_RETRIES) {
        const delay = Math.min(BASE_DELAY * Math.pow(2, retryCountRef.current), MAX_DELAY)
        retryCountRef.current++
        setState((prev) => ({ ...prev, connectionState: 'reconnecting' }))
        setTimeout(() => channelChatService.connect(channelId, buildCallbacks()), delay)
      }
    },
  }), [channelId, handleConnected, handleMessage, handleUserJoined, handleUserLeft, handleReactionUpdate, handleError])

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
