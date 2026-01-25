/**
 * Web Speech Recognition Service
 *
 * Wraps browser's Web Speech API for speech recognition:
 * - Real-time streaming recognition
 * - Multi-language support
 * - Automatic permission handling
 * - Event-based architecture
 */

interface SpeechRecognitionResult {
  transcription: string
  isFinal: boolean
  confidence: number
}

type SpeechRecognitionListener = (result: SpeechRecognitionResult) => void
type SpeechErrorListener = (error: { error: string }) => void

class WebSpeechService {
  private recognition: any = null
  private resultListeners: SpeechRecognitionListener[] = []
  private errorListeners: SpeechErrorListener[] = []
  private isListening = false
  private currentLanguage = 'en-US'

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition()
        this.setupRecognition()
      }
    }
  }

  private setupRecognition() {
    if (!this.recognition) return

    this.recognition.continuous = true
    this.recognition.interimResults = true
    this.recognition.lang = this.currentLanguage

    this.recognition.onresult = (event: any) => {
      const results = event.results
      const lastResult = results[results.length - 1]
      const transcript = lastResult[0].transcript
      const isFinal = lastResult.isFinal
      const confidence = lastResult[0].confidence || 0

      const result: SpeechRecognitionResult = {
        transcription: transcript,
        isFinal,
        confidence,
      }

      this.resultListeners.forEach((listener) => listener(result))
    }

    this.recognition.onerror = (event: any) => {
      const error = { error: event.error || 'Unknown error' }
      this.errorListeners.forEach((listener) => listener(error))
    }

    this.recognition.onend = () => {
      // Auto-restart if we're supposed to be listening
      if (this.isListening) {
        try {
          this.recognition.start()
        } catch (e) {
          // Already started or error, ignore
        }
      }
    }
  }

  /**
   * Check if browser supports speech recognition
   */
  isSupported(): boolean {
    return this.recognition !== null
  }

  /**
   * Request microphone permissions (browser will handle this automatically)
   */
  async requestPermissions(): Promise<{ granted: boolean }> {
    if (!this.isSupported()) {
      return { granted: false }
    }

    try {
      // Try to start recognition briefly to trigger permission prompt
      await this.recognition.start()
      await this.recognition.stop()
      return { granted: true }
    } catch (error) {
      return { granted: false }
    }
  }

  /**
   * Set recognition language
   * @param languageCode - Language code (e.g., 'en-US', 'he-IL', 'es-ES')
   */
  setLanguage(languageCode: string): void {
    // Map simple language codes to full locale codes
    const languageMap: Record<string, string> = {
      'en': 'en-US',
      'he': 'he-IL',
      'es': 'es-ES',
      'fr': 'fr-FR',
      'it': 'it-IT',
      'zh': 'zh-CN',
      'ja': 'ja-JP',
      'hi': 'hi-IN',
      'ta': 'ta-IN',
      'bn': 'bn-IN',
    }

    this.currentLanguage = languageMap[languageCode] || languageCode
    if (this.recognition) {
      this.recognition.lang = this.currentLanguage
    }
  }

  /**
   * Start speech recognition
   */
  async startRecognition(): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('Speech recognition not supported in this browser')
    }

    if (this.isListening) {
      return // Already listening
    }

    try {
      this.isListening = true
      await this.recognition.start()
    } catch (error: any) {
      // Ignore if already started
      if (error.error !== 'not-allowed') {
        this.isListening = false
      }
      throw error
    }
  }

  /**
   * Stop speech recognition
   */
  async stopRecognition(): Promise<void> {
    if (!this.recognition || !this.isListening) {
      return
    }

    this.isListening = false
    this.recognition.stop()
  }

  /**
   * Toggle recognition on/off
   */
  async toggleRecognition(): Promise<boolean> {
    if (this.isListening) {
      await this.stopRecognition()
      return false
    } else {
      await this.startRecognition()
      return true
    }
  }

  /**
   * Check if currently listening
   */
  getIsListening(): boolean {
    return this.isListening
  }

  /**
   * Add listener for recognition results
   */
  addResultListener(listener: SpeechRecognitionListener): void {
    this.resultListeners.push(listener)
  }

  /**
   * Remove result listener
   */
  removeResultListener(listener: SpeechRecognitionListener): void {
    this.resultListeners = this.resultListeners.filter((l) => l !== listener)
  }

  /**
   * Add listener for recognition errors
   */
  addErrorListener(listener: SpeechErrorListener): void {
    this.errorListeners.push(listener)
  }

  /**
   * Remove error listener
   */
  removeErrorListener(listener: SpeechErrorListener): void {
    this.errorListeners = this.errorListeners.filter((l) => l !== listener)
  }
}

// Export singleton instance
export const webSpeechService = new WebSpeechService()

export type { SpeechRecognitionResult }
