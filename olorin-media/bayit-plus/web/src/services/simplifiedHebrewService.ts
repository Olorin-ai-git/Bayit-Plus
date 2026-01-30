/**
 * Simplified Hebrew (Ivrit Kalla) Service
 * Captures audio from video element and streams to WebSocket for simplified Hebrew dubbing
 * Mirrors liveSubtitleService.ts architecture
 */

import logger from '@/utils/logger'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

export type VocabularyLevel = 'alef' | 'bet' | 'gimel'

export interface SimplifiedHebrewConnectionInfo {
  type: 'connected'
  session_id: string
  mode: string
  vocabulary_level: VocabularyLevel
  voice_id: string
  speaking_rate: number
  initial_balance?: number
  credit_rate?: number
  estimated_runtime_seconds?: number
  source_language: string
}

export interface SimplifiedTextMessage {
  type: 'simplified_text'
  original_text: string
  simplified_text: string
  vocabulary_level: VocabularyLevel
  timestamp: number
}

export interface SimplifiedAudioMessage {
  type: 'simplified_audio'
  data: string
  original_text: string
  simplified_text: string
  sequence: number
  timestamp_ms: number
  latency_ms: number
}

export interface SimplifiedHebrewAvailability {
  available: boolean
  source_language?: string
  vocabulary_levels?: VocabularyLevel[]
  default_vocabulary_level?: VocabularyLevel
  speaking_rate?: number
  voice_id?: string
  error?: string
}

type ConnectionCallback = (info: SimplifiedHebrewConnectionInfo) => void
type TextCallback = (message: SimplifiedTextMessage) => void
type AudioCallback = (message: SimplifiedAudioMessage) => void
type ErrorCallback = (error: string, recoverable: boolean) => void

class SimplifiedHebrewService {
  private ws: WebSocket | null = null
  private audioContext: AudioContext | null = null
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null
  private processor: ScriptProcessorNode | null = null
  private isConnected: boolean = false

  async connect(
    channelId: string,
    vocabularyLevel: VocabularyLevel,
    videoElement: HTMLVideoElement,
    onConnected: ConnectionCallback,
    onText: TextCallback,
    onAudio: AudioCallback,
    onError: ErrorCallback,
    voiceId?: string,
    platform: string = 'web',
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const authData = JSON.parse(localStorage.getItem('bayit-auth') || '{}')
        const token = authData?.state?.token
        if (!token) {
          reject(new Error('Not authenticated'))
          return
        }

        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const wsHost = API_BASE_URL.replace(/^https?:\/\//, '')
        let wsUrl = `${wsProtocol}//${wsHost}/ws/live/${channelId}/simplified-hebrew?platform=${platform}&vocabulary_level=${vocabularyLevel}`
        if (voiceId) {
          wsUrl += `&voice_id=${voiceId}`
        }

        this.ws = new WebSocket(wsUrl)

        const connectionTimeout = setTimeout(() => {
          if (!this.isConnected) {
            logger.error('Connection timeout', 'simplifiedHebrewService')
            this.disconnect()
            reject(new Error('Connection timeout'))
          }
        }, 10000)

        this.ws.onopen = () => {
          logger.debug('WebSocket connected, sending authentication', 'simplifiedHebrewService')
          this.ws?.send(JSON.stringify({ type: 'authenticate', token }))
        }

        this.ws.onmessage = async (event) => {
          try {
            const msg = JSON.parse(event.data)
            if (msg.type === 'connected') {
              this.isConnected = true
              clearTimeout(connectionTimeout)
              onConnected(msg)
              await this.startAudioCapture(videoElement)
              resolve()
            } else if (msg.type === 'simplified_text') {
              onText(msg)
            } else if (msg.type === 'simplified_audio') {
              onAudio(msg)
            } else if (msg.type === 'quota_exceeded') {
              clearTimeout(connectionTimeout)
              onError(`Usage limit reached: ${msg.message}`, false)
              this.disconnect()
              reject(new Error(msg.message))
            } else if (msg.type === 'error') {
              clearTimeout(connectionTimeout)
              onError(msg.message, msg.recoverable ?? false)
              if (!msg.recoverable) {
                reject(new Error(msg.message))
              }
            }
          } catch (error) {
            logger.error('WebSocket parse error', 'simplifiedHebrewService', error)
          }
        }

        this.ws.onerror = (error) => {
          logger.error('WebSocket error', 'simplifiedHebrewService', error)
          clearTimeout(connectionTimeout)
          onError('Connection error', false)
          this.isConnected = false
          reject(new Error('Connection error'))
        }

        this.ws.onclose = () => {
          clearTimeout(connectionTimeout)
          this.isConnected = false
          this.stopAudioCapture()
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Connection failed'
        onError(errorMsg, false)
        reject(error)
      }
    })
  }

  private async startAudioCapture(videoElement: HTMLVideoElement): Promise<void> {
    try {
      this.audioContext = new AudioContext({ sampleRate: 16000 })

      const captureMethod = (videoElement as any).captureStream || (videoElement as any).mozCaptureStream
      if (!captureMethod) {
        throw new Error('captureStream() not supported')
      }

      const stream = captureMethod.call(videoElement)
      if (!stream) {
        throw new Error('captureStream() returned null')
      }

      const audioTracks = stream.getAudioTracks()
      if (audioTracks.length === 0) {
        throw new Error('No audio tracks available from video element')
      }

      this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream)
      this.processor = this.audioContext.createScriptProcessor(2048, 1, 1)

      let chunkCount = 0

      this.processor.onaudioprocess = (e) => {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return

        const inputData = e.inputBuffer.getChannelData(0)
        const int16Data = new Int16Array(inputData.length)
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]))
          int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7fff
        }

        this.ws.send(int16Data.buffer)
        chunkCount++

        if (chunkCount % 100 === 0) {
          logger.debug(`Sent ${chunkCount} audio chunks`, 'simplifiedHebrewService')
        }
      }

      this.mediaStreamSource.connect(this.processor)
      this.processor.connect(this.audioContext.destination)
      logger.debug('Audio capture started for simplified Hebrew', 'simplifiedHebrewService')
    } catch (error) {
      logger.error('Audio capture error', 'simplifiedHebrewService', error)
      throw error
    }
  }

  disconnect(): void {
    this.stopAudioCapture()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.isConnected = false
  }

  private stopAudioCapture(): void {
    if (this.processor) {
      this.processor.disconnect()
      this.processor = null
    }
    if (this.mediaStreamSource) {
      this.mediaStreamSource.disconnect()
      this.mediaStreamSource = null
    }
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
  }

  isServiceConnected(): boolean {
    return this.isConnected && this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  static async checkAvailability(channelId: string): Promise<SimplifiedHebrewAvailability> {
    try {
      const authData = JSON.parse(localStorage.getItem('bayit-auth') || '{}')
      const token = authData?.state?.token
      const response = await fetch(
        `${API_BASE_URL}/live/${channelId}/simplified-hebrew/status`,
        { headers: { 'Authorization': `Bearer ${token}` } },
      )

      if (!response.ok) {
        throw new Error('Failed to check availability')
      }

      return await response.json()
    } catch (error) {
      logger.error('Error checking simplified Hebrew availability', 'simplifiedHebrewService', error)
      return { available: false, error: 'Check failed' }
    }
  }
}

export const SimplifiedHebrewServiceClass = SimplifiedHebrewService
export default new SimplifiedHebrewService()
