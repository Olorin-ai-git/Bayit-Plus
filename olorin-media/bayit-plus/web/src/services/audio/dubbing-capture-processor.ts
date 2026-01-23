/**
 * DubbingCaptureProcessor - AudioWorklet for capturing audio
 * Runs on the audio rendering thread for low-latency processing.
 * This file exports the processor code as a string for inline registration.
 */

// Configuration for AudioWorklet processor from environment variables
// Note: AudioWorklet runs in a separate context and cannot access environment variables
// directly, so config is read here and injected via processorOptions at instantiation.
//
// Configuration defaults (used when env vars not set):
// - Buffer size 2048: Standard audio buffer that balances latency vs processing efficiency
// - Silence threshold 0.001: Typical noise floor threshold (-60dB)
// - Silence warning at 100 chunks: ~4 seconds of silence triggers warning

const parseIntEnv = (key: string, defaultValue: number): number => {
  const value = import.meta.env[key]
  if (value === undefined || value === '') return defaultValue
  const parsed = parseInt(value, 10)
  if (isNaN(parsed)) {
    console.warn(`[DubbingProcessor] Invalid ${key}: "${value}", using default ${defaultValue}`)
    return defaultValue
  }
  return parsed
}

const parseFloatEnv = (key: string, defaultValue: number): number => {
  const value = import.meta.env[key]
  if (value === undefined || value === '') return defaultValue
  const parsed = parseFloat(value)
  if (isNaN(parsed)) {
    console.warn(`[DubbingProcessor] Invalid ${key}: "${value}", using default ${defaultValue}`)
    return defaultValue
  }
  return parsed
}

export const PROCESSOR_CONFIG = {
  bufferSize: parseIntEnv('VITE_DUBBING_BUFFER_SIZE', 2048),
  silenceThreshold: parseFloatEnv('VITE_DUBBING_SILENCE_THRESHOLD', 0.001),
  silenceWarningThreshold: parseIntEnv('VITE_DUBBING_SILENCE_WARNING_THRESHOLD', 100),
} as const

// Validate configuration at load time
if (PROCESSOR_CONFIG.bufferSize < 128 || PROCESSOR_CONFIG.bufferSize > 16384) {
  throw new Error(`[DubbingProcessor] bufferSize must be 128-16384, got ${PROCESSOR_CONFIG.bufferSize}`)
}
if (PROCESSOR_CONFIG.silenceThreshold < 0 || PROCESSOR_CONFIG.silenceThreshold > 1) {
  throw new Error(`[DubbingProcessor] silenceThreshold must be 0-1, got ${PROCESSOR_CONFIG.silenceThreshold}`)
}
if (PROCESSOR_CONFIG.silenceWarningThreshold < 1) {
  throw new Error(`[DubbingProcessor] silenceWarningThreshold must be >= 1, got ${PROCESSOR_CONFIG.silenceWarningThreshold}`)
}

// The AudioWorklet processor code as a string for blob URL creation
// Buffer size and thresholds are injected from PROCESSOR_CONFIG
export const DUBBING_CAPTURE_PROCESSOR_CODE = `
/**
 * DubbingCaptureProcessor - Captures audio and sends to main thread
 * Converts float32 samples to int16 PCM for server
 */
class DubbingCaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    // Configuration from processor options or defaults
    const config = options?.processorOptions || {};
    this.bufferSize = config.bufferSize || ${PROCESSOR_CONFIG.bufferSize};
    this.silenceThreshold = config.silenceThreshold || ${PROCESSOR_CONFIG.silenceThreshold};
    this.silenceWarningThreshold = config.silenceWarningThreshold || ${PROCESSOR_CONFIG.silenceWarningThreshold};

    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
    this.silentChunks = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input.length) {
      return true;
    }

    const channelData = input[0];
    if (!channelData) {
      return true;
    }

    // Accumulate samples into buffer with overflow protection
    for (let i = 0; i < channelData.length; i++) {
      // Buffer overflow protection: ensure we never write beyond buffer bounds
      if (this.bufferIndex >= this.bufferSize) {
        this.processBuffer();
        this.bufferIndex = 0;
      }
      this.buffer[this.bufferIndex++] = channelData[i];
    }

    // Process any remaining full buffer
    if (this.bufferIndex >= this.bufferSize) {
      this.processBuffer();
      this.bufferIndex = 0;
    }

    return true;
  }

  processBuffer() {
    // Calculate max amplitude for silence detection
    let maxAmplitude = 0;
    for (let i = 0; i < this.bufferSize; i++) {
      maxAmplitude = Math.max(maxAmplitude, Math.abs(this.buffer[i]));
    }

    // Track silence
    if (maxAmplitude < this.silenceThreshold) {
      this.silentChunks++;
      if (this.silentChunks === this.silenceWarningThreshold) {
        this.port.postMessage({ type: 'warning', message: 'Extended silence detected' });
      }
    } else {
      this.silentChunks = 0;
    }

    // Convert float32 to int16 PCM
    const int16Data = new Int16Array(this.bufferSize);
    for (let i = 0; i < this.bufferSize; i++) {
      const s = Math.max(-1, Math.min(1, this.buffer[i]));
      int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    // Send to main thread
    this.port.postMessage({
      type: 'audio',
      data: int16Data.buffer,
      amplitude: maxAmplitude
    }, [int16Data.buffer]);
  }
}

registerProcessor('dubbing-capture-processor', DubbingCaptureProcessor);
`;

/**
 * Creates a blob URL for the AudioWorklet processor
 */
export function createProcessorBlobUrl(): string {
  const blob = new Blob([DUBBING_CAPTURE_PROCESSOR_CODE], { type: 'application/javascript' });
  return URL.createObjectURL(blob);
}
