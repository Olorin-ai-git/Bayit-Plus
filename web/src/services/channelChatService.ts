/**
 * Channel Chat Service - WebSocket chat for live TV channels
 */

import logger from '@/utils/logger'
import type {
  ConnectedData, ChatMessageData, UserJoinData, UserLeftData,
  ReactionUpdateData, MessageDeletedData, UserMutedData, UserUnmutedData,
  ChannelChatCallbacks, ChatHistoryResponse,
} from './channelChatTypes'

export type {
  ConnectedData, ChatMessageData, UserJoinData, UserLeftData,
  ReactionUpdateData, MessageDeletedData, UserMutedData, UserUnmutedData,
  ChannelChatCallbacks, ChatHistoryResponse,
}

const API_BASE_URL = import.meta.env.VITE_API_URL
const AUTH_STORAGE_KEY = 'bayit-auth'

function validateConfiguration(): void {
  if (!API_BASE_URL) {
    throw new Error('[ChannelChat] VITE_API_URL environment variable is required.')
  }
}

if (!API_BASE_URL) {
  logger.warn('VITE_API_URL not configured - channel chat will fail', 'channelChatService')
}

class ChannelChatService {
  private ws: WebSocket | null = null
  private isConnected = false
  private currentChannelId: string | null = null
  private sessionToken: string | null = null
  private callbacks: ChannelChatCallbacks | null = null

  async connect(channelId: string, callbacks: ChannelChatCallbacks, isLive = true): Promise<void> {
    try { validateConfiguration() } catch (error) {
      callbacks.onError('CONFIG_ERROR', error instanceof Error ? error.message : 'Configuration error', false)
      return
    }
    try {
      const authData = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || '{}')
      const token = authData?.state?.token
      if (!token) throw new Error('Not authenticated')

      this.currentChannelId = channelId
      this.callbacks = callbacks
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsHost = API_BASE_URL.replace(/^https?:\/\//, '').replace(/\/api\/v1\/?$/, '')
      const wsPathPrefix = isLive ? 'live' : 'content'
      this.ws = new WebSocket(`${wsProtocol}//${wsHost}/api/v1/ws/${wsPathPrefix}/${channelId}/chat`)

      this.ws.onopen = () => {
        logger.debug('WebSocket connected, authenticating...', 'channelChatService')
        this.ws?.send(JSON.stringify({ type: 'authenticate', token }))
        this.isConnected = true
      }
      this.ws.onmessage = (event) => this.handleMessage(event, callbacks)
      this.ws.onerror = (error) => {
        logger.error('WebSocket error', 'channelChatService', error)
        callbacks.onError('CONNECTION_ERROR', 'Connection error', true)
        this.isConnected = false
      }
      this.ws.onclose = (event) => {
        logger.debug(`WebSocket closed: ${event.code} - ${event.reason}`, 'channelChatService')
        this.isConnected = false
        this.currentChannelId = null
        this.sessionToken = null
        callbacks.onDisconnect()
      }
    } catch (error) {
      callbacks.onError('CONNECTION_FAILED', error instanceof Error ? error.message : 'Connection failed', false)
    }
  }

  private handleMessage(event: MessageEvent, callbacks: ChannelChatCallbacks): void {
    try {
      const msg = JSON.parse(event.data)
      switch (msg.type) {
        case 'connected':
          this.sessionToken = msg.session_token
          callbacks.onConnected(msg as ConnectedData)
          break
        case 'channel_chat_message':
          callbacks.onMessage(msg as ChatMessageData)
          break
        case 'user_joined':
          callbacks.onUserJoined(msg as UserJoinData)
          break
        case 'user_left':
          callbacks.onUserLeft(msg as UserLeftData)
          break
        case 'reaction_update':
          callbacks.onReactionUpdate(msg as ReactionUpdateData)
          break
        case 'message_deleted':
          callbacks.onMessageDeleted?.(msg as MessageDeletedData)
          break
        case 'user_muted':
          callbacks.onUserMuted?.(msg as UserMutedData)
          break
        case 'user_unmuted':
          callbacks.onUserUnmuted?.(msg as UserUnmutedData)
          break
        case 'ping':
          this.sendPong()
          break
        case 'error':
          logger.error(`Server error: ${msg.message}`, 'channelChatService')
          callbacks.onError(msg.code || 'UNKNOWN_ERROR', msg.message, msg.recoverable ?? true)
          break
      }
    } catch (error) {
      logger.error('WebSocket parse error', 'channelChatService', error)
    }
  }

  sendMessage(message: string, sessionToken?: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.warn('Cannot send message - not connected', 'channelChatService')
      return
    }
    this.ws.send(JSON.stringify({
      type: 'chat',
      message,
      session_token: sessionToken || this.sessionToken,
    }))
  }

  sendReaction(messageId: string, reaction: string, sessionToken?: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.warn('Cannot send reaction - not connected', 'channelChatService')
      return
    }
    this.ws.send(JSON.stringify({
      type: 'reaction',
      message_id: messageId,
      reaction,
      session_token: sessionToken || this.sessionToken,
    }))
  }

  sendPong(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'pong' }))
    }
  }

  disconnect(): void {
    if (this.ws) { this.ws.close(); this.ws = null }
    this.isConnected = false
    this.currentChannelId = null
    this.sessionToken = null
    this.callbacks = null
    logger.debug('Disconnected', 'channelChatService')
  }

  isServiceConnected(): boolean {
    return this.isConnected && this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  static async translateMessage(
    channelId: string, text: string, fromLang: string, toLang: string, isLive = true,
  ): Promise<string | null> {
    validateConfiguration()
    try {
      const authData = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || '{}')
      const token = authData?.state?.token
      const params = new URLSearchParams({ text, to_lang: toLang })
      if (fromLang) params.set('from_lang', fromLang)
      const pathPrefix = isLive ? 'live' : 'content'
      const response = await fetch(
        `${API_BASE_URL}/${pathPrefix}/${channelId}/chat/translate?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      if (!response.ok) throw new Error('Translation failed')
      const data = await response.json()
      return data.translated_text || null
    } catch (error) {
      logger.error('Error translating message', 'channelChatService', error)
      return null
    }
  }

  static async fetchHistory(
    channelId: string, before?: string, limit?: number, isLive = true,
  ): Promise<ChatHistoryResponse> {
    validateConfiguration()
    const authData = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || '{}')
    const token = authData?.state?.token
    const params = new URLSearchParams()
    if (before) params.set('before', before)
    if (limit) params.set('limit', String(limit))
    const pathPrefix = isLive ? 'live' : 'content'
    const url = `${API_BASE_URL}/${pathPrefix}/${channelId}/chat/history${params.toString() ? `?${params.toString()}` : ''}`
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new Error(`Failed to fetch chat history: ${errorText}`)
    }
    return response.json()
  }
}

export { ChannelChatService }
export default new ChannelChatService()
