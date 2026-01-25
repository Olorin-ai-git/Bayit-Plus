/**
 * Shared Audio Capture Service
 *
 * Provides reliable audio capture from video elements for both:
 * - Live Subtitles (STT → display text)
 * - Live Dubbing (STT → translate → TTS → play audio)
 *
 * Uses proven approach: ScriptProcessorNode with parent-provided AudioContext
 */

import logger from '@/utils/logger'

export interface AudioCaptureCallbacks {
  onAudioData: (audioData: ArrayBuffer) => void  // Called with int16 PCM audio chunks
  onError: (message: string) => void              // Called on errors
}

export class SharedAudioCapture {
  private mediaStreamSource: MediaStreamSourceNode | null = null
  private processor: ScriptProcessorNode | null = null
  private chunkCount = 0
  private audioContext: AudioContext
  private bufferSize: number
  private chunkLogInterval: number
  private callbacks: AudioCaptureCallbacks

  constructor(
    audioContext: AudioContext,
    bufferSize: number,
    chunkLogInterval: number,
    callbacks: AudioCaptureCallbacks
  ) {
    this.audioContext = audioContext
    this.bufferSize = bufferSize
    this.chunkLogInterval = chunkLogInterval
    this.callbacks = callbacks
  }

  /**
   * Start capturing audio from video element.
   * Uses the exact approach from Live Subtitles that works reliably.
   */
  async start(videoElement: HTMLVideoElement): Promise<void> {
    try {
      console.log('[SharedAudioCapture] Starting audio capture...')

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
      console.log(`[SharedAudioCapture] Video stream captured with ${audioTracks.length} audio track(s)`)

      if (audioTracks.length === 0) {
        throw new Error('No audio tracks available from video element')
      }

      // Log audio track details for debugging
      audioTracks.forEach((track, i) => {
        console.log(`[SharedAudioCapture] Track ${i}: ${track.label || 'unnamed'}, enabled=${track.enabled}, muted=${track.muted}`)
      })

      this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream)

      // Use buffer size for latency control
      // 2048 samples at 16kHz = 128ms per chunk
      this.processor = this.audioContext.createScriptProcessor(this.bufferSize, 1, 1)
      console.log(`[SharedAudioCapture] Audio processor created (buffer size: ${this.bufferSize})`)

      let silentChunks = 0

      this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0)

        // Check if audio is silent (all zeros = likely CORS blocked or muted)
        let maxAmplitude = 0
        for (let i = 0; i < inputData.length; i++) {
          maxAmplitude = Math.max(maxAmplitude, Math.abs(inputData[i]))
        }

        if (maxAmplitude < 0.001) {
          silentChunks++
          if (silentChunks === 100) {
            console.warn('[SharedAudioCapture] 100 consecutive silent chunks detected')
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

        // Send to callback
        this.callbacks.onAudioData(int16Data.buffer)
        this.chunkCount++

        // Log every N chunks with audio level info
        if (this.chunkCount % this.chunkLogInterval === 0) {
          const dbLevel = maxAmplitude > 0 ? 20 * Math.log10(maxAmplitude) : -100
          console.log(`[SharedAudioCapture] Sent ${this.chunkCount} chunks, level: ${dbLevel.toFixed(1)}dB`)
        }
      }

      this.mediaStreamSource.connect(this.processor)
      this.processor.connect(this.audioContext.destination)
      console.log('[SharedAudioCapture] Audio capture started - capturing DIRECTLY from video')
    } catch (error) {
      console.error('[SharedAudioCapture] Audio capture error:', error)
      const message = error instanceof Error ? error.message : 'Audio capture failed'
      this.callbacks.onError(message)
      throw error
    }
  }

  /**
   * Stop audio capture and cleanup resources.
   */
  stop(): void {
    try {
      if (this.processor) {
        this.processor.disconnect()
        this.processor = null
      }

      if (this.mediaStreamSource) {
        this.mediaStreamSource.disconnect()
        this.mediaStreamSource = null
      }

      console.log('[SharedAudioCapture] Audio capture stopped')
    } catch (error) {
      console.error('[SharedAudioCapture] Error stopping audio capture:', error)
    }
  }

  /**
   * Get current chunk count (for debugging).
   */
  getChunkCount(): number {
    return this.chunkCount
  }

  /**
   * Check if audio capture is active.
   */
  isActive(): boolean {
    return this.processor !== null
  }
}
