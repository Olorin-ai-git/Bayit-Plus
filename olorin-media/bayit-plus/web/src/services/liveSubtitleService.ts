/**
 * Live Subtitle Service
 * Captures audio from video element and streams to WebSocket for real-time translation
 */

import logger from '@/utils/logger'

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
        logger.debug('WebSocket connected', 'liveSubtitleService')
        this.isConnected = true
        await this.startAudioCapture(videoElement)
      }

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          logger.debug('Message received', 'liveSubtitleService', { type: msg.type, msg })
          if (msg.type === 'connected') {
            logger.debug(`Connected - Source: ${msg.source_lang}, Target: ${msg.target_lang}`, 'liveSubtitleService')
          } else if (msg.type === 'subtitle') {
            logger.debug('Subtitle received', 'liveSubtitleService', { text: msg.data.text, data: msg.data })
            logger.debug('Calling onSubtitle callback', 'liveSubtitleService', msg.data)
            onSubtitle(msg.data)
            logger.debug('onSubtitle callback completed', 'liveSubtitleService')
          } else if (msg.type === 'error') {
            logger.error('Server error', 'liveSubtitleService', msg.message)
            onError(msg.message)
          }
        } catch (error) {
          logger.error('WebSocket parse error', 'liveSubtitleService', error)
        }
      }

      this.ws.onerror = (error) => {
        logger.error('WebSocket error', 'liveSubtitleService', error)
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
   * Capture audio DIRECTLY from video element (not microphone).
   * Uses captureStream() to get the video's internal audio track.
   */
  private async startAudioCapture(videoElement: HTMLVideoElement): Promise<void> {
    try {
      // Use 16kHz sample rate for ElevenLabs Scribe
      this.audioContext = new AudioContext({ sampleRate: 16000 })
      logger.debug('AudioContext created with sampleRate: 16000Hz', 'liveSubtitleService')

      // IMPORTANT: captureStream() gets audio DIRECTLY from video element
      // This does NOT use the microphone - it captures the video's audio track
      const captureMethod = (videoElement as any).captureStream || (videoElement as any).mozCaptureStream
      if (!captureMethod) {
        throw new Error('captureStream() not supported - cannot capture video audio directly')
      }

      const stream = captureMethod.call(videoElement)
      if (!stream) {
        throw new Error('captureStream() returned null - video may have CORS restrictions')
      }

      // Verify we have audio tracks from the video
      const audioTracks = stream.getAudioTracks()
      logger.debug(`Video stream captured with ${audioTracks.length} audio track(s)`, 'liveSubtitleService')

      if (audioTracks.length === 0) {
        logger.error('No audio tracks in video stream', 'liveSubtitleService', {
          message: 'This usually means: 1. The video has no audio, OR 2. CORS is blocking audio capture (cross-origin video) 3. The video element is muted'
        })
        throw new Error('No audio tracks available from video element')
      }

      // Log audio track details for debugging
      audioTracks.forEach((track, i) => {
        logger.debug(`Track ${i}: ${track.label || 'unnamed'}, enabled=${track.enabled}, muted=${track.muted}`, 'liveSubtitleService')
      })

      this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream)

      // Use smaller buffer (2048) for lower latency (~128ms vs ~256ms)
      // 2048 samples at 16kHz = 128ms per chunk
      this.processor = this.audioContext.createScriptProcessor(2048, 1, 1)
      logger.debug('Audio processor created (buffer size: 2048, ~128ms latency)', 'liveSubtitleService')

      let chunkCount = 0
      let silentChunks = 0

      this.processor.onaudioprocess = (e) => {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          if (chunkCount % 100 === 0) {
            logger.warn('WebSocket not ready, skipping audio chunk', 'liveSubtitleService')
          }
          return
        }

        const inputData = e.inputBuffer.getChannelData(0)

        // Check if audio is silent (all zeros = likely CORS blocked or muted)
        let maxAmplitude = 0
        for (let i = 0; i < inputData.length; i++) {
          maxAmplitude = Math.max(maxAmplitude, Math.abs(inputData[i]))
        }

        if (maxAmplitude < 0.001) {
          silentChunks++
          // Warn if we're getting only silence
          if (silentChunks === 100) {
            logger.warn('100 consecutive silent chunks detected - Audio may be blocked by CORS or video is muted', 'liveSubtitleService')
          }
        } else {
          silentChunks = 0
        }

        // Convert float32 to int16 PCM
        const int16Data = new Int16Array(inputData.length)
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]))
          int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7fff
        }

        this.ws.send(int16Data.buffer)
        chunkCount++

        // Log every 100 chunks with audio level info
        if (chunkCount % 100 === 0) {
          const dbLevel = maxAmplitude > 0 ? 20 * Math.log10(maxAmplitude) : -100
          logger.debug(`Sent ${chunkCount} chunks, level: ${dbLevel.toFixed(1)}dB`, 'liveSubtitleService')
        }
      }

      this.mediaStreamSource.connect(this.processor)
      this.processor.connect(this.audioContext.destination)
      logger.debug('Audio capture started - capturing DIRECTLY from video (not microphone)', 'liveSubtitleService')
    } catch (error) {
      logger.error('Audio capture error', 'liveSubtitleService', error)
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
      logger.error('Error checking subtitle availability', 'liveSubtitleService', error)
      return { available: false, error: 'Check failed' }
    }
  }
}

export default new LiveSubtitleService()
