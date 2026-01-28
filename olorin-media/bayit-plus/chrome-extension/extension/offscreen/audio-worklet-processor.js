/**
 * AudioWorklet Processor
 *
 * Replaces deprecated ScriptProcessorNode for audio processing
 * Runs on dedicated audio thread (no main thread blocking)
 *
 * Converts Float32 audio to Int16 PCM for WebSocket transmission
 */

class PCMEncoderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.sampleRate = 16000; // Target sample rate
  }

  /**
   * Process audio input
   * Called on audio thread (high priority, no blocking)
   */
  process(inputs, outputs, parameters) {
    const input = inputs[0];

    // No input available
    if (!input || !input[0]) {
      return true; // Keep processor alive
    }

    const channelData = input[0]; // Mono channel

    // Convert Float32 [-1.0, 1.0] to Int16 [-32768, 32767]
    const pcmData = new Int16Array(channelData.length);

    for (let i = 0; i < channelData.length; i++) {
      // Clamp to valid range and convert to Int16
      const sample = Math.max(-1.0, Math.min(1.0, channelData[i]));
      pcmData[i] = Math.floor(sample * 32767);
    }

    // Send PCM data to main thread
    this.port.postMessage({
      type: 'audio',
      data: pcmData,
    });

    // Keep processor alive
    return true;
  }
}

// Register processor
registerProcessor('pcm-encoder-processor', PCMEncoderProcessor);
