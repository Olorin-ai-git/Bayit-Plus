/**
 * Live Trivia Service
 * Text-only WebSocket client for real-time trivia fact delivery.
 * Receives transcript text (forwarded from live subtitle stream) and
 * sends it to the backend for topic detection and fact generation.
 */

import logger from '@/utils/logger'
import type { LiveTriviaFact } from '@/components/player/hooks/useLiveTrivia'

const API_BASE_URL = import.meta.env.VITE_API_URL

const AUTH_STORAGE_KEY = 'bayit-auth'

const LOG_CONTEXT = 'liveTriviaService'

/**
 * Validates that VITE_API_URL is configured. Throws if missing.
 */
function validateConfiguration(): void {
  if (!API_BASE_URL) {
    throw new Error(
      '[LiveTrivia] VITE_API_URL environment variable is required. ' +
      'Live trivia cannot function without API configuration.'
    )
  }
}

if (!API_BASE_URL) {
  logger.warn('VITE_API_URL not configured - trivia features will fail', LOG_CONTEXT)
}

type FactCallback = (fact: LiveTriviaFact) => void
type ConnectedCallback = (sourceLanguage: string) => void
type ErrorCallback = (error: { message: string; recoverable: boolean }) => void

class LiveTriviaService {
  private ws: WebSocket | null = null
  private isConnected = false
  private onFact: FactCallback | null = null
  private onConnected: ConnectedCallback | null = null
  private onError: ErrorCallback | null = null

  /**
   * Connect to the live trivia WebSocket for a given channel.
   * Authentication is done via message (JWT from localStorage), not URL params.
   */
  connect(
    channelId: string,
    onFact: FactCallback,
    onConnected: ConnectedCallback,
    onError: ErrorCallback,
  ): void {
    validateConfiguration()

    // Disconnect any existing connection first
    this.disconnect()

    this.onFact = onFact
    this.onConnected = onConnected
    this.onError = onError

    const authData = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || '{}')
    const token = authData?.state?.token
    if (!token) {
      onError({ message: 'Not authenticated', recoverable: false })
      return
    }

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsHost = API_BASE_URL.replace(/^https?:\/\//, '')
    const wsUrl = `${wsProtocol}//${wsHost}/ws/live/${channelId}/trivia`

    logger.info(`Connecting to trivia WebSocket for channel ${channelId}`, LOG_CONTEXT)
    this.ws = new WebSocket(wsUrl)

    const connectionTimeout = setTimeout(() => {
      if (!this.isConnected) {
        logger.error('Connection timeout', LOG_CONTEXT)
        this.onError?.({ message: 'Connection timeout', recoverable: true })
        this.disconnect()
      }
    }, 10000)

    this.ws.onopen = () => {
      logger.debug('WebSocket connected, sending authentication', LOG_CONTEXT)
      this.ws?.send(JSON.stringify({ type: 'authenticate', token }))
    }

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        logger.debug('Message received', LOG_CONTEXT, { type: msg.type })

        switch (msg.type) {
          case 'connected':
            this.isConnected = true
            clearTimeout(connectionTimeout)
            logger.info(
              `Authenticated - source_language: ${msg.source_language}`,
              LOG_CONTEXT,
            )
            this.onConnected?.(msg.source_language || 'he')
            break

          case 'trivia_fact':
            if (msg.data) {
              this.onFact?.(msg.data as LiveTriviaFact)
            }
            break

          case 'quota_exceeded':
            logger.warn('Quota exceeded', LOG_CONTEXT, msg.message)
            clearTimeout(connectionTimeout)
            this.onError?.({ message: msg.message || 'Usage limit reached', recoverable: false })
            this.disconnect()
            break

          case 'error':
            logger.error('Server error', LOG_CONTEXT, msg.message)
            clearTimeout(connectionTimeout)
            this.onError?.({
              message: msg.message || 'Server error',
              recoverable: msg.recoverable ?? true,
            })
            if (!msg.recoverable) {
              this.disconnect()
            }
            break

          default:
            logger.debug(`Unknown message type: ${msg.type}`, LOG_CONTEXT)
        }
      } catch (error) {
        logger.error('WebSocket message handling error', LOG_CONTEXT, error)
      }
    }

    this.ws.onerror = () => {
      logger.error('WebSocket error', LOG_CONTEXT)
      clearTimeout(connectionTimeout)
      this.onError?.({ message: 'Connection error', recoverable: true })
      this.isConnected = false
    }

    this.ws.onclose = () => {
      clearTimeout(connectionTimeout)
      this.isConnected = false
      logger.info('WebSocket closed', LOG_CONTEXT)
    }
  }

  /**
   * Send transcript text to the backend for trivia processing.
   * Called when live subtitle cues arrive with original_text.
   */
  sendTranscript(text: string, language: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return
    }
    if (!text.trim()) {
      return
    }
    this.ws.send(JSON.stringify({ type: 'transcript', text, language }))
  }

  /**
   * Disconnect and clean up all resources.
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.isConnected = false
    this.onFact = null
    this.onConnected = null
    this.onError = null
  }

  /**
   * Check if service is currently connected and authenticated.
   */
  isServiceConnected(): boolean {
    return this.isConnected && this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  /**
   * Check if live trivia is available for a channel (REST call).
   */
  static async checkAvailability(channelId: string): Promise<{
    available: boolean
    source_language?: string
    error?: string
  }> {
    try {
      validateConfiguration()
      const authData = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || '{}')
      const token = authData?.state?.token
      const response = await fetch(
        `${API_BASE_URL}/live/${channelId}/trivia/status`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        },
      )

      if (!response.ok) {
        throw new Error('Failed to check availability')
      }

      return await response.json()
    } catch (error) {
      logger.error('Error checking trivia availability', LOG_CONTEXT, error)
      return { available: false, error: 'Check failed' }
    }
  }
}

export default new LiveTriviaService()
