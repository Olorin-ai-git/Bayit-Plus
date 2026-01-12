/**
 * Live Subtitle Service
 * Captures audio from video element and streams to WebSocket for real-time translation
 */

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

export interface LiveSubtitleCue {
  text: string
  original_text: string
  timestamp: number
  source_lang: string
  target_lang: string
  confidence: number
}

type SubtitleCallback = (cue: LiveSubtitleCue) => void
type ErrorCallback = (error: string) => void

class LiveSubtitleService {
  private ws: WebSocket | null = null
  private audioContext: AudioContext | null = null
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null
  private processor: ScriptProcessorNode | null = null
  private isConnected: boolean = false

  /**
   * Connect to live subtitle WebSocket and start audio capture.
   */
  async connect(
    channelId: string,
    targetLang: string,
    videoElement: HTMLVideoElement,
    onSubtitle: SubtitleCallback,
    onError: ErrorCallback
  ): Promise<void> {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) throw new Error('Not authenticated')

      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsHost = API_BASE_URL.replace(/^https?:\/\//, '')
      const wsUrl = `${wsProtocol}//${wsHost}/api/v1/ws/live/${channelId}/subtitles?token=${token}&target_lang=${targetLang}`

      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = async () => {
        console.log('Live subtitle connected')
        this.isConnected = true
        await this.startAudioCapture(videoElement)
      }

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'subtitle') onSubtitle(msg.data)
          else if (msg.type === 'error') onError(msg.message)
        } catch (error) {
          console.error('WebSocket parse error:', error)
        }
      }

      this.ws.onerror = () => {
        onError('Connection error')
        this.isConnected = false
      }

      this.ws.onclose = () => {
        this.isConnected = false
        this.stopAudioCapture()
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Connection failed')
    }
  }

  /**
   * Capture audio from video element and send to WebSocket.
   */
  private async startAudioCapture(videoElement: HTMLVideoElement): Promise<void> {
    try {
      this.audioContext = new AudioContext({ sampleRate: 16000 })

      const stream = (videoElement as any).captureStream?.() || (videoElement as any).mozCaptureStream?.()
      if (!stream) throw new Error('Audio capture not supported')

      this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream)
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1)

      this.processor.onaudioprocess = (e) => {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return

        const inputData = e.inputBuffer.getChannelData(0)
        const int16Data = new Int16Array(inputData.length)

        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]))
          int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7fff
        }

        this.ws.send(int16Data.buffer)
      }

      this.mediaStreamSource.connect(this.processor)
      this.processor.connect(this.audioContext.destination)
      console.log('Audio capture started')
    } catch (error) {
      console.error('Audio capture error:', error)
      throw error
    }
  }

  /**
   * Stop audio capture and close connection.
   */
  disconnect(): void {
    this.stopAudioCapture()

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.isConnected = false
  }

  /**
   * Stop audio processing.
   */
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

  /**
   * Check if service is currently connected.
   */
  isServiceConnected(): boolean {
    return this.isConnected && this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  /**
   * Check if live subtitles are available for a channel.
   */
  static async checkAvailability(channelId: string): Promise<{
    available: boolean
    source_language?: string
    supported_target_languages?: string[]
    error?: string
  }> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/live/${channelId}/subtitles/status`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        }
      )

      if (!response.ok) {
        throw new Error('Failed to check availability')
      }

      return await response.json()
    } catch (error) {
      console.error('Error checking subtitle availability:', error)
      return { available: false, error: 'Check failed' }
    }
  }
}

export default new LiveSubtitleService()
