/**
 * Live Trivia Service
 * Text-only WebSocket client for real-time trivia fact delivery.
 * Receives transcript text (forwarded from live subtitle stream) and
 * sends it to the backend for topic detection and fact generation.
 */

import logger from '@/utils/logger'
import type { LiveTriviaFact } from '@/components/player/hooks/useLiveTrivia'
import i18n from '@bayit/i18n'

const API_BASE_URL = import.meta.env.VITE_API_URL

const AUTH_STORAGE_KEY = 'bayit-auth'

const LOG_CONTEXT = 'liveTriviaService'

/** MongoDB ObjectId format: 24-character lowercase hex */
const CHANNEL_ID_PATTERN = /^[a-f0-9]{24}$/

/** Connection timeout in milliseconds */
const CONNECTION_TIMEOUT_MS = 10_000

/** Default source language when backend omits it */
const DEFAULT_SOURCE_LANGUAGE = 'he'

/** Maximum allowed display duration for a trivia fact (seconds) */
const MAX_DISPLAY_DURATION_S = 120

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

/**
 * Runtime type guard for incoming trivia_fact WebSocket data.
 * Prevents malformed or injected data from reaching the UI.
 */
function isValidTriviaFact(data: unknown): data is LiveTriviaFact {
  if (!data || typeof data !== 'object') return false
  const d = data as Record<string, unknown>
  return (
    typeof d.fact_id === 'string' &&
    typeof d.text === 'string' &&
    typeof d.text_en === 'string' &&
    typeof d.text_es === 'string' &&
    typeof d.category === 'string' &&
    typeof d.display_duration === 'number' &&
    d.display_duration > 0 &&
    d.display_duration <= MAX_DISPLAY_DURATION_S &&
    typeof d.priority === 'number'
  )
}

/**
 * Validates that channelId is a valid MongoDB ObjectId (24-char hex).
 * Prevents path injection in the WebSocket URL.
 */
function isValidChannelId(channelId: string): boolean {
  return CHANNEL_ID_PATTERN.test(channelId)
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

    if (!isValidChannelId(channelId)) {
      onError({ message: i18n.t('errors.trivia.invalidChannel'), recoverable: false })
      return
    }

    // Disconnect any existing connection first
    this.disconnect()

    this.onFact = onFact
    this.onConnected = onConnected
    this.onError = onError

    const authData = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || '{}')
    const token = authData?.state?.token
    if (!token) {
      onError({ message: i18n.t('errors.auth.notAuthenticated'), recoverable: false })
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
        this.onError?.({ message: i18n.t('errors.connection.timeout'), recoverable: true })
        this.disconnect()
      }
    }, CONNECTION_TIMEOUT_MS)

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
            this.onConnected?.(msg.source_language || DEFAULT_SOURCE_LANGUAGE)
            break

          case 'trivia_fact':
            if (msg.data && isValidTriviaFact(msg.data)) {
              this.onFact?.(msg.data)
            } else if (msg.data) {
              logger.error('Invalid trivia fact data received', LOG_CONTEXT, msg.data)
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
      this.onError?.({ message: i18n.t('errors.connection.error'), recoverable: true })
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

      if (!isValidChannelId(channelId)) {
        return { available: false, error: 'Invalid channel ID' }
      }

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

export { LiveTriviaService }
export default new LiveTriviaService()
