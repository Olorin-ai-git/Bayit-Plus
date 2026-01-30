/**
 * Channel Chat Service - WebSocket chat for live TV channels
 */

import logger from '@/utils/logger'
import type {
  ConnectedData, ChatMessageData, UserJoinData, UserLeftData,
  ReactionUpdateData, ChannelChatCallbacks,
} from './channelChatTypes'

export type { ConnectedData, ChatMessageData, UserJoinData, UserLeftData, ReactionUpdateData, ChannelChatCallbacks }

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

  async connect(channelId: string, callbacks: ChannelChatCallbacks): Promise<void> {
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
      this.ws = new WebSocket(`${wsProtocol}//${wsHost}/api/v1/ws/live/${channelId}/chat`)

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
          this.sessionToken = msg.sessionToken
          callbacks.onConnected(msg as ConnectedData)
          break
        case 'message': callbacks.onMessage(msg.data as ChatMessageData); break
        case 'user_joined': callbacks.onUserJoined(msg.data as UserJoinData); break
        case 'user_left': callbacks.onUserLeft(msg.data as UserLeftData); break
        case 'reaction_update': callbacks.onReactionUpdate(msg.data as ReactionUpdateData); break
        case 'ping': this.sendPong(); break
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
    this.ws.send(JSON.stringify({ type: 'send_message', message, sessionToken: sessionToken || this.sessionToken }))
  }

  sendReaction(messageId: string, reaction: string, sessionToken?: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.warn('Cannot send reaction - not connected', 'channelChatService')
      return
    }
    this.ws.send(JSON.stringify({ type: 'send_reaction', messageId, reaction, sessionToken: sessionToken || this.sessionToken }))
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

  static async translateMessage(channelId: string, text: string, fromLang: string, toLang: string): Promise<string | null> {
    validateConfiguration()
    try {
      const authData = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || '{}')
      const token = authData?.state?.token
      const response = await fetch(`${API_BASE_URL}/live/${channelId}/chat/translate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, from_language: fromLang, to_language: toLang }),
      })
      if (!response.ok) throw new Error('Translation failed')
      const data = await response.json()
      return data.translated_text || null
    } catch (error) {
      logger.error('Error translating message', 'channelChatService', error)
      return null
    }
  }
}

export { ChannelChatService }
export default new ChannelChatService()
