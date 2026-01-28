/**
 * AudioWorklet Node Wrapper
 *
 * Manages AudioWorklet for audio processing
 * Handles audio capture, resampling, PCM encoding
 * Integrates performance monitoring for CPU profiling
 */

import { createLogger } from '@/lib/logger';
import { CONFIG } from '@/config/constants';
import { PerformanceMonitor } from '@/lib/performance-monitor';

const logger = createLogger('AudioWorkletNode');

export class AudioWorkletManager {
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private onAudioDataCallback: ((pcmData: Int16Array) => void) | null = null;
  private performanceMonitor: PerformanceMonitor;

  constructor() {
    this.performanceMonitor = new PerformanceMonitor();
  }

  /**
   * Initialize AudioWorklet with media stream
   */
  async initialize(stream: MediaStream, onAudioData: (pcmData: Int16Array) => void): Promise<void> {
    try {
      logger.info('Initializing AudioWorklet', {
        sampleRate: CONFIG.AUDIO.SAMPLE_RATE,
        bufferSize: CONFIG.AUDIO.BUFFER_SIZE,
      });

      this.onAudioDataCallback = onAudioData;

      // Mark start of capture-to-encode latency
      this.performanceMonitor.markStart('captureToEncode');

      // Create audio context with target sample rate
      this.audioContext = new AudioContext({
        sampleRate: CONFIG.AUDIO.SAMPLE_RATE,
      });

      // Load worklet processor module
      await this.audioContext.audioWorklet.addModule(
        chrome.runtime.getURL('offscreen/audio-worklet-processor.js')
      );

      // Create worklet node
      this.workletNode = new AudioWorkletNode(
        this.audioContext,
        'pcm-encoder-processor',
        {
          numberOfInputs: 1,
          numberOfOutputs: 0, // No output (processing only)
          channelCount: CONFIG.AUDIO.CHANNELS,
        }
      );

      // Listen for PCM data from worklet
      this.workletNode.port.onmessage = (event: MessageEvent) => {
        if (event.data.type === 'audio') {
          // Track AudioWorklet call for CPU profiling
          this.performanceMonitor.trackAudioWorkletCall();

          // Measure capture-to-encode latency
          const captureToEncode = this.performanceMonitor.markEnd('captureToEncode');

          this.handleAudioData(event.data.data);

          // Restart latency measurement for next cycle
          this.performanceMonitor.markStart('captureToEncode');
        }
      };

      // Connect audio stream to worklet
      this.sourceNode = this.audioContext.createMediaStreamSource(stream);
      this.sourceNode.connect(this.workletNode);

      logger.info('AudioWorklet initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize AudioWorklet', { error: String(error) });
      throw error;
    }
  }

  /**
   * Handle audio data from worklet
   */
  private handleAudioData(pcmData: Int16Array): void {
    if (this.onAudioDataCallback) {
      this.onAudioDataCallback(pcmData);
    }
  }

  /**
   * Stop audio processing and cleanup
   */
  async stop(): Promise<void> {
    try {
      logger.info('Stopping AudioWorklet');

      // Log performance summary before stopping
      this.performanceMonitor.logSummary();

      if (this.sourceNode) {
        this.sourceNode.disconnect();
        this.sourceNode = null;
      }

      if (this.workletNode) {
        this.workletNode.disconnect();
        this.workletNode = null;
      }

      if (this.audioContext && this.audioContext.state !== 'closed') {
        await this.audioContext.close();
        this.audioContext = null;
      }

      this.onAudioDataCallback = null;

      // Reset performance metrics
      this.performanceMonitor.reset();

      logger.info('AudioWorklet stopped successfully');
    } catch (error) {
      logger.error('Failed to stop AudioWorklet', { error: String(error) });
      throw error;
    }
  }

  /**
   * Check if worklet is active
   */
  isActive(): boolean {
    return this.audioContext !== null && this.audioContext.state === 'running';
  }

  /**
   * Get performance report
   */
  getPerformanceReport() {
    return this.performanceMonitor.getReport();
  }

  /**
   * Measure CPU usage
   */
  measureCPU() {
    return this.performanceMonitor.measureCPU();
  }
}
