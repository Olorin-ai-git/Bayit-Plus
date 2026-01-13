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
      const authData = JSON.parse(localStorage.getItem('bayit-auth') || '{}')
      const token = authData?.state?.token
      if (!token) throw new Error('Not authenticated')

      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsHost = API_BASE_URL.replace(/^https?:\/\//, '')
      const wsUrl = `${wsProtocol}//${wsHost}/ws/live/${channelId}/subtitles?token=${token}&target_lang=${targetLang}`

      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = async () => {
        console.log('✅ [LiveSubtitle] WebSocket connected')
        this.isConnected = true
        await this.startAudioCapture(videoElement)
      }

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          console.log('📨 [LiveSubtitle] Message received:', msg.type)
          if (msg.type === 'connected') {
            console.log(`🌍 [LiveSubtitle] Connected - Source: ${msg.source_lang}, Target: ${msg.target_lang}`)
          } else if (msg.type === 'subtitle') {
            console.log('📝 [LiveSubtitle] Subtitle received:', msg.data.text)
            onSubtitle(msg.data)
          } else if (msg.type === 'error') {
            console.error('❌ [LiveSubtitle] Server error:', msg.message)
            onError(msg.message)
          }
        } catch (error) {
          console.error('❌ [LiveSubtitle] WebSocket parse error:', error)
        }
      }

      this.ws.onerror = (error) => {
        console.error('❌ [LiveSubtitle] WebSocket error:', error)
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
      console.log('🎤 [LiveSubtitle] AudioContext created with sampleRate: 16000Hz')

      const stream = (videoElement as any).captureStream?.() || (videoElement as any).mozCaptureStream?.()
      if (!stream) {
        throw new Error('Audio capture not supported by this browser')
      }
      console.log('📹 [LiveSubtitle] Video stream captured')

      this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream)
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1)
      console.log('🔧 [LiveSubtitle] Audio processor created (buffer size: 4096)')

      let chunkCount = 0
      this.processor.onaudioprocess = (e) => {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          if (chunkCount % 100 === 0) {
            console.warn('⚠️ [LiveSubtitle] WebSocket not ready, skipping audio chunk')
          }
          return
        }

        const inputData = e.inputBuffer.getChannelData(0)
        const int16Data = new Int16Array(inputData.length)

        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]))
          int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7fff
        }

        this.ws.send(int16Data.buffer)
        chunkCount++

        // Log every 100 chunks to avoid console spam
        if (chunkCount % 100 === 0) {
          console.log(`📦 [LiveSubtitle] Sent ${chunkCount} audio chunks (${int16Data.length} samples/chunk, ${int16Data.length * 2} bytes/chunk)`)
        }
      }

      this.mediaStreamSource.connect(this.processor)
      this.processor.connect(this.audioContext.destination)
      console.log('✅ [LiveSubtitle] Audio capture started successfully')
    } catch (error) {
      console.error('❌ [LiveSubtitle] Audio capture error:', error)
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
      const authData = JSON.parse(localStorage.getItem('bayit-auth') || '{}')
      const token = authData?.state?.token
      const response = await fetch(
        `${API_BASE_URL}/live/${channelId}/subtitles/status`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
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
