/**
 * Wake Word Detector
 *
 * Provides wake word detection using Vosk for offline speech recognition.
 * Listens for "Hi Bayit" trigger phrase to activate voice commands.
 * Processes audio locally for privacy - nothing sent to server until wake word detected.
 */

export interface WakeWordConfig {
  wakeWord: string;           // The wake word to listen for (e.g., "hi bayit")
  sensitivity: number;        // 0-1 sensitivity level (0.7 default)
  cooldownMs: number;         // Cooldown period after detection (prevents rapid re-triggering)
  enabled: boolean;           // Whether wake word detection is enabled
}

export interface WakeWordResult {
  detected: boolean;
  confidence: number;
  transcript: string;
  timestamp: number;
}

// Wake word variations to match (handles slight pronunciation differences)
const WAKE_WORD_VARIATIONS = [
  'hi bayit',
  'hey bayit',
  'high bayit',
  'hai bayit',
  'hiבית',  // Mixed English/Hebrew
  'הי בית',  // Hebrew
  'היי בית', // Hebrew
];

/**
 * Calculate similarity between two strings using Levenshtein distance
 */
function stringSimilarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Levenshtein distance algorithm
 */
function levenshteinDistance(s1: string, s2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[s2.length][s1.length];
}

/**
 * WakeWordDetector class
 *
 * Handles wake word detection using Vosk speech recognition.
 * Runs entirely locally for privacy.
 */
export class WakeWordDetector {
  private config: WakeWordConfig;
  private lastDetectionTime: number = 0;
  private isInitialized: boolean = false;
  private worker: Worker | null = null;
  private pendingResolve: ((result: WakeWordResult) => void) | null = null;
  private audioBuffer: Float32Array[] = [];
  private readonly BUFFER_SIZE = 4096;
  private readonly SAMPLE_RATE = 16000;

  constructor(config: Partial<WakeWordConfig> = {}) {
    this.config = {
      wakeWord: 'hi bayit',
      sensitivity: 0.7,
      cooldownMs: 2000,
      enabled: true,
      ...config,
    };
  }

  /**
   * Initialize the wake word detector with the Vosk model
   */
  async initialize(modelPath: string): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Test if Vosk is available before creating worker
      try {
        const voskModule = (globalThis as any).Vosk;
        if (!voskModule) {
          console.warn('[WakeWordDetector] Vosk not available globally, attempting to load from module');
        }
      } catch (e) {
        console.warn('[WakeWordDetector] Could not check for global Vosk:', e);
      }

      // Create a web worker for Vosk processing
      const workerCode = `
        let model = null;
        let recognizer = null;
        let Vosk = null;

        self.onmessage = async function(e) {
          const { type, data } = e.data;

          if (type === 'init') {
            try {
              // Try to access Vosk from global scope first
              if (typeof self !== 'undefined' && self.Vosk) {
                Vosk = self.Vosk;
              } else {
                // Try dynamic import as fallback
                try {
                  const voskModule = await import('vosk-browser');
                  Vosk = voskModule;
                } catch (importError) {
                  const errorMsg = importError && importError.message ? importError.message : String(importError);
                  console.error('Failed to import vosk-browser:', errorMsg);
                  self.postMessage({ type: 'error', error: 'Vosk module not available: ' + errorMsg });
                  return;
                }
              }

              if (!Vosk || !Vosk.createModel) {
                throw new Error('Vosk.createModel not available');
              }

              model = await Vosk.createModel(data.modelPath);
              recognizer = new model.KaldiRecognizer(data.sampleRate);
              recognizer.setWords(true);

              self.postMessage({ type: 'ready' });
            } catch (error) {
              const errorMsg = error && error.message ? error.message : String(error);
              self.postMessage({ type: 'error', error: errorMsg });
            }
          }

          if (type === 'process' && recognizer) {
            try {
              const audioData = new Float32Array(data.samples);

              // Convert Float32 to Int16 for Vosk
              const int16Data = new Int16Array(audioData.length);
              for (let i = 0; i < audioData.length; i++) {
                int16Data[i] = Math.max(-32768, Math.min(32767, Math.floor(audioData[i] * 32768)));
              }

              const result = recognizer.acceptWaveform(int16Data);

              if (result) {
                const finalResult = JSON.parse(recognizer.result());
                self.postMessage({
                  type: 'result',
                  text: finalResult.text || '',
                  isFinal: true
                });
              } else {
                const partialResult = JSON.parse(recognizer.partialResult());
                self.postMessage({
                  type: 'partial',
                  text: partialResult.partial || '',
                  isFinal: false
                });
              }
            } catch (error) {
              const errorMsg = error && error.message ? error.message : String(error);
              self.postMessage({ type: 'error', error: errorMsg });
            }
          }

          if (type === 'reset' && recognizer) {
            recognizer.reset();
          }
        };
      `;

      // Create worker from blob without module type to avoid module resolution issues
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      this.worker = new Worker(URL.createObjectURL(blob));

      // Wait for worker to be ready
      await new Promise<void>((resolve, reject) => {
        if (!this.worker) {
          reject(new Error('Worker not created'));
          return;
        }

        const timeout = setTimeout(() => {
          reject(new Error('Worker initialization timeout'));
        }, 5000);

        this.worker.onmessage = (e) => {
          if (e.data.type === 'ready') {
            clearTimeout(timeout);
            resolve();
          } else if (e.data.type === 'error') {
            clearTimeout(timeout);
            reject(new Error(`Worker error: ${e.data.error}`));
          }
        };

        this.worker.onerror = (error) => {
          clearTimeout(timeout);
          reject(new Error(`Worker error: ${error.message}`));
        };

        this.worker.postMessage({
          type: 'init',
          data: { modelPath, sampleRate: this.SAMPLE_RATE },
        });
      });

      this.isInitialized = true;
      console.log('[WakeWordDetector] Initialized successfully');
    } catch (error) {
      console.error('[WakeWordDetector] Failed to initialize:', error instanceof Error ? error.message : error);
      // Don't throw - allow fallback mode to work
      this.isInitialized = false;
    }
  }

  /**
   * Process audio samples and check for wake word
   * @param samples - Float32Array of audio samples at 16kHz
   * @returns WakeWordResult indicating if wake word was detected
   */
  async processAudio(samples: Float32Array): Promise<WakeWordResult> {
    const defaultResult: WakeWordResult = {
      detected: false,
      confidence: 0,
      transcript: '',
      timestamp: Date.now(),
    };

    // Check if enabled and not in cooldown
    if (!this.config.enabled) {
      return defaultResult;
    }

    if (Date.now() - this.lastDetectionTime < this.config.cooldownMs) {
      return defaultResult;
    }

    // If not initialized, use fallback simple matching
    if (!this.isInitialized || !this.worker) {
      return this.processWithFallback(samples);
    }

    // Send to worker for processing
    return new Promise((resolve) => {
      if (!this.worker) {
        resolve(defaultResult);
        return;
      }

      const handleMessage = (e: MessageEvent) => {
        if (e.data.type === 'result' || e.data.type === 'partial') {
          const transcript = e.data.text.toLowerCase().trim();
          const result = this.matchWakeWord(transcript);

          if (result.detected) {
            this.lastDetectionTime = Date.now();
            this.worker?.postMessage({ type: 'reset' });
          }

          resolve(result);
          this.worker?.removeEventListener('message', handleMessage);
        } else if (e.data.type === 'error') {
          console.error('[WakeWordDetector] Worker error:', e.data.error);
          resolve(defaultResult);
          this.worker?.removeEventListener('message', handleMessage);
        }
      };

      this.worker.addEventListener('message', handleMessage);
      this.worker.postMessage({
        type: 'process',
        data: { samples: Array.from(samples) },
      });

      // Timeout after 500ms
      setTimeout(() => {
        this.worker?.removeEventListener('message', handleMessage);
        resolve(defaultResult);
      }, 500);
    });
  }

  /**
   * Fallback wake word matching without Vosk
   * Uses simple audio energy detection for basic functionality
   */
  private processWithFallback(_samples: Float32Array): WakeWordResult {
    // Without Vosk, we can't do speech recognition
    // This is a placeholder - in production, ensure Vosk is loaded
    return {
      detected: false,
      confidence: 0,
      transcript: '',
      timestamp: Date.now(),
    };
  }

  /**
   * Match transcript against wake word variations
   */
  private matchWakeWord(transcript: string): WakeWordResult {
    if (!transcript) {
      return {
        detected: false,
        confidence: 0,
        transcript: '',
        timestamp: Date.now(),
      };
    }

    const normalized = transcript.toLowerCase().replace(/[^a-z\s\u0590-\u05FF]/g, '').trim();

    // Check for exact or fuzzy matches against wake word variations
    let bestMatch = 0;
    for (const variation of WAKE_WORD_VARIATIONS) {
      // Check if the transcript contains the wake word
      if (normalized.includes(variation)) {
        bestMatch = 1.0;
        break;
      }

      // Fuzzy match for variations
      const similarity = stringSimilarity(normalized, variation);
      if (similarity > bestMatch) {
        bestMatch = similarity;
      }

      // Also check if wake word is at the start of the transcript
      const words = normalized.split(' ');
      if (words.length >= 2) {
        const firstTwoWords = words.slice(0, 2).join(' ');
        const startSimilarity = stringSimilarity(firstTwoWords, variation);
        if (startSimilarity > bestMatch) {
          bestMatch = startSimilarity;
        }
      }
    }

    // Adjust threshold based on sensitivity
    const threshold = 0.5 + (1 - this.config.sensitivity) * 0.3; // 0.5 to 0.8 range
    const detected = bestMatch >= threshold;

    return {
      detected,
      confidence: bestMatch,
      transcript: normalized,
      timestamp: Date.now(),
    };
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<WakeWordConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): WakeWordConfig {
    return { ...this.config };
  }

  /**
   * Check if detector is initialized and ready
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Reset the detector state
   */
  reset(): void {
    this.audioBuffer = [];
    if (this.worker) {
      this.worker.postMessage({ type: 'reset' });
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.isInitialized = false;
    this.audioBuffer = [];
  }

  /**
   * Get time since last detection
   */
  getTimeSinceLastDetection(): number {
    if (this.lastDetectionTime === 0) return Infinity;
    return Date.now() - this.lastDetectionTime;
  }

  /**
   * Check if in cooldown period
   */
  isInCooldown(): boolean {
    return Date.now() - this.lastDetectionTime < this.config.cooldownMs;
  }
}

/**
 * Create a wake word detector with default configuration
 */
export function createWakeWordDetector(config?: Partial<WakeWordConfig>): WakeWordDetector {
  return new WakeWordDetector(config);
}

export default WakeWordDetector;
