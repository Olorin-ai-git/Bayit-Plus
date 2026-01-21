/**
 * Audio Buffer Manager
 *
 * Manages a rolling audio buffer for constant listening mode.
 * Stores audio chunks during speech and exports them for
 * transcription when the user finishes speaking.
 */

// Maximum buffer duration in milliseconds (30 seconds safety limit)
const MAX_BUFFER_DURATION_MS = 30000;

// Default rolling buffer duration (10 seconds)
const DEFAULT_BUFFER_DURATION_MS = 10000;

// Sample rate (standard for speech recognition)
const SAMPLE_RATE = 16000;

export interface AudioBufferConfig {
  maxDurationMs?: number;
  sampleRate?: number;
}

export interface AudioChunk {
  data: Float32Array;
  timestamp: number;
}

export class AudioBufferManager {
  private chunks: AudioChunk[] = [];
  private maxDurationMs: number;
  private sampleRate: number;
  private speechStartTimestamp: number | null = null;
  private isRecordingSpeech: boolean = false;

  constructor(config: AudioBufferConfig = {}) {
    this.maxDurationMs = Math.min(
      config.maxDurationMs ?? DEFAULT_BUFFER_DURATION_MS,
      MAX_BUFFER_DURATION_MS
    );
    this.sampleRate = config.sampleRate ?? SAMPLE_RATE;
  }

  /**
   * Add an audio chunk to the buffer
   * @param data - Float32Array of audio samples
   */
  addChunk(data: Float32Array): void {
    const timestamp = Date.now();

    this.chunks.push({
      data: new Float32Array(data),  // Clone to avoid mutation
      timestamp,
    });

    this.trimToMaxDuration();
  }

  /**
   * Mark the start of speech (for tracking speech-only audio)
   */
  startSpeech(): void {
    if (!this.isRecordingSpeech) {
      this.speechStartTimestamp = Date.now();
      this.isRecordingSpeech = true;
    }
  }

  /**
   * Mark the end of speech
   */
  endSpeech(): void {
    this.isRecordingSpeech = false;
  }

  /**
   * Check if currently recording speech
   */
  isRecording(): boolean {
    return this.isRecordingSpeech;
  }

  /**
   * Get total duration of buffered audio in milliseconds
   */
  getDuration(): number {
    if (this.chunks.length === 0) return 0;

    const firstTimestamp = this.chunks[0].timestamp;
    const lastTimestamp = this.chunks[this.chunks.length - 1].timestamp;

    return lastTimestamp - firstTimestamp;
  }

  /**
   * Get total number of samples in buffer
   */
  getSampleCount(): number {
    return this.chunks.reduce((sum, chunk) => sum + chunk.data.length, 0);
  }

  /**
   * Get memory usage in bytes (approximate)
   */
  getMemoryUsage(): number {
    // Float32Array uses 4 bytes per sample
    return this.getSampleCount() * 4;
  }

  /**
   * Export all buffered audio as a single Float32Array
   */
  exportSamples(): Float32Array {
    const totalLength = this.getSampleCount();
    const result = new Float32Array(totalLength);

    let offset = 0;
    for (const chunk of this.chunks) {
      result.set(chunk.data, offset);
      offset += chunk.data.length;
    }

    return result;
  }

  /**
   * Export audio since speech started (if available)
   * Falls back to all buffered audio if no speech start was marked
   */
  exportSpeechSamples(): Float32Array {
    if (!this.speechStartTimestamp || this.chunks.length === 0) {
      return this.exportSamples();
    }

    // Find chunks since speech started (with small buffer before)
    const speechStartWithBuffer = this.speechStartTimestamp - 500; // 500ms before speech
    const speechChunks = this.chunks.filter(c => c.timestamp >= speechStartWithBuffer);

    if (speechChunks.length === 0) {
      return this.exportSamples();
    }

    const totalLength = speechChunks.reduce((sum, chunk) => sum + chunk.data.length, 0);
    const result = new Float32Array(totalLength);

    let offset = 0;
    for (const chunk of speechChunks) {
      result.set(chunk.data, offset);
      offset += chunk.data.length;
    }

    return result;
  }

  /**
   * Export buffer as WAV Blob for API upload
   */
  exportAsWav(): Blob {
    const samples = this.exportSpeechSamples();
    return this.createWavBlob(samples);
  }

  /**
   * Export buffer as WebM Blob (if supported by platform)
   * Falls back to WAV if WebM not available
   */
  exportAsWebm(): Blob {
    // WebM encoding typically requires MediaRecorder
    // For simplicity, we'll use WAV which is universally supported
    return this.exportAsWav();
  }

  /**
   * Clear all buffered audio
   */
  clear(): void {
    this.chunks = [];
    this.speechStartTimestamp = null;
    this.isRecordingSpeech = false;
  }

  /**
   * Trim buffer to max duration by removing oldest chunks
   */
  private trimToMaxDuration(): void {
    if (this.chunks.length === 0) return;

    const now = Date.now();
    const minTimestamp = now - this.maxDurationMs;

    // Remove chunks older than max duration
    while (this.chunks.length > 0 && this.chunks[0].timestamp < minTimestamp) {
      this.chunks.shift();
    }
  }

  /**
   * Create WAV blob from Float32Array samples
   */
  private createWavBlob(samples: Float32Array): Blob {
    const numChannels = 1;  // Mono
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = this.sampleRate * blockAlign;
    const dataSize = samples.length * bytesPerSample;
    const bufferSize = 44 + dataSize;  // 44 byte WAV header

    const buffer = new ArrayBuffer(bufferSize);
    const view = new DataView(buffer);

    // WAV header
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);  // File size - 8
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);  // Subchunk1 size (16 for PCM)
    view.setUint16(20, 1, true);   // Audio format (1 = PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, this.sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // Audio data (convert Float32 to Int16)
    let offset = 44;
    for (let i = 0; i < samples.length; i++) {
      // Clamp and convert to 16-bit signed integer
      const sample = Math.max(-1, Math.min(1, samples[i]));
      const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, int16, true);
      offset += 2;
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  /**
   * Write ASCII string to DataView
   */
  private writeString(view: DataView, offset: number, str: string): void {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): AudioBufferConfig {
    return {
      maxDurationMs: this.maxDurationMs,
      sampleRate: this.sampleRate,
    };
  }
}

/**
 * Create a default audio buffer manager
 */
export function createAudioBuffer(config?: AudioBufferConfig): AudioBufferManager {
  return new AudioBufferManager(config);
}

export default AudioBufferManager;
