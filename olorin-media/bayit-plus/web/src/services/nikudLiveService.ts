/**
 * Live Nikud Service
 * Connects to WebSocket for real-time vocalized Hebrew subtitles
 * Mirrors smartSubsService.ts architecture
 */

import logger from '@/utils/logger'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

export interface NikudSubtitleCue {
  type: 'nikud_subtitle'
  data: {
    text: string
    text_nikud: string
    timestamp: number
    display_duration_ms: number
  }
}

export interface NikudLiveConnectionInfo {
  type: 'connected'
  session_id: string
  mode: string
  display_duration_ms: number
  initial_balance?: number
  credit_rate?: number
  estimated_runtime_seconds?: number
  source_language: string
}

export interface NikudLiveAvailability {
  available: boolean
  source_language?: string
  nikud_style?: string
  display_duration_ms?: number
  error?: string
}

type ConnectionCallback = (info: NikudLiveConnectionInfo) => void
type CueCallback = (cue: NikudSubtitleCue) => void
type ErrorCallback = (error: string, recoverable: boolean) => void

class NikudLiveService {
  private ws: WebSocket | null = null
  private audioContext: AudioContext | null = null
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null
  private processor: ScriptProcessorNode | null = null
  private isConnected: boolean = false

  async connect(
    channelId: string,
    videoElement: HTMLVideoElement,
    onConnected: ConnectionCallback,
    onCue: CueCallback,
    onError: ErrorCallback,
    platform: string = 'web',
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let settled = false

      const settle = (action: 'resolve' | 'reject', value?: Error) => {
        if (settled) return
        settled = true
        clearTimeout(connectionTimeout)
        if (action === 'resolve') resolve()
        else reject(value)
      }

      try {
        const authData = JSON.parse(localStorage.getItem('bayit-auth') || '{}')
        const token = authData?.state?.token
        if (!token) {
          settle('reject', new Error('Not authenticated'))
          return
        }

        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const wsHost = API_BASE_URL.replace(/^https?:\/\//, '')
        const wsUrl = `${wsProtocol}//${wsHost}/ws/live/${channelId}/nikud?platform=${platform}`

        this.ws = new WebSocket(wsUrl)

        const connectionTimeout = setTimeout(() => {
          if (!this.isConnected) {
            logger.error('Connection timeout', 'nikudLiveService')
            this.disconnect()
            settle('reject', new Error('Connection timeout'))
          }
        }, 10000)

        this.ws.onopen = () => {
          logger.debug('WebSocket connected, sending authentication', 'nikudLiveService')
          this.ws?.send(JSON.stringify({ type: 'authenticate', token }))
        }

        this.ws.onmessage = async (event) => {
          try {
            const msg = JSON.parse(event.data)
            if (msg.type === 'connected') {
              this.isConnected = true
              onConnected(msg)
              await this.startAudioCapture(videoElement)
              settle('resolve')
            } else if (msg.type === 'nikud_subtitle') {
              onCue(msg)
            } else if (msg.type === 'quota_exceeded') {
              onError(`Usage limit reached: ${msg.message}`, false)
              this.disconnect()
              settle('reject', new Error(msg.message))
            } else if (msg.type === 'error') {
              onError(msg.message, msg.recoverable ?? false)
              if (!msg.recoverable) {
                settle('reject', new Error(msg.message))
              }
            }
          } catch (error) {
            logger.error('WebSocket parse error', 'nikudLiveService', error)
          }
        }

        this.ws.onerror = (error) => {
          logger.error('WebSocket error', 'nikudLiveService', error)
          onError('Connection error', false)
          this.isConnected = false
          settle('reject', new Error('Connection error'))
        }

        this.ws.onclose = () => {
          clearTimeout(connectionTimeout)
          this.isConnected = false
          this.stopAudioCapture()
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Connection failed'
        onError(errorMsg, false)
        settle('reject', error instanceof Error ? error : new Error(errorMsg))
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
          logger.debug(`Sent ${chunkCount} audio chunks`, 'nikudLiveService')
        }
      }

      this.mediaStreamSource.connect(this.processor)
      this.processor.connect(this.audioContext.destination)
      logger.debug('Audio capture started for Live Nikud', 'nikudLiveService')
    } catch (error) {
      logger.error('Audio capture error', 'nikudLiveService', error)
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

  static async checkAvailability(channelId: string): Promise<NikudLiveAvailability> {
    try {
      const authData = JSON.parse(localStorage.getItem('bayit-auth') || '{}')
      const token = authData?.state?.token
      const response = await fetch(
        `${API_BASE_URL}/live/${channelId}/nikud/status`,
        { headers: { 'Authorization': `Bearer ${token}` } },
      )

      if (!response.ok) {
        throw new Error('Failed to check availability')
      }

      return await response.json()
    } catch (error) {
      logger.error('Error checking Live Nikud availability', 'nikudLiveService', error)
      return { available: false, error: 'Check failed' }
    }
  }
}

export const NikudLiveServiceClass = NikudLiveService
export default new NikudLiveService()
